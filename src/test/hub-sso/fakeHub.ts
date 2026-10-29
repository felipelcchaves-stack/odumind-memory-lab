/**
 * A tiny OIDC provider for the hub-sso tests: discovery, JWKS and a token endpoint that checks the
 * client secret, the redirect_uri and PKCE (S256), and issues RS256-signed ID tokens. Listens on an
 * ephemeral 127.0.0.1 port. Also signs back-channel logout tokens.
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";

export const CLIENT_ID = "hub-9-test";
export const CLIENT_SECRET = "s3cret with spaces&symbols";
export const APP_URL = "https://gba-orun.example.test";
export const REDIRECT_URI = `${APP_URL}/auth/hub/callback`;

type KeyLike = Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];

export type IdClaims = Record<string, unknown>;

export type FakeHub = {
  issuer: string;
  close(): Promise<void>;
  /** Registers a code the token endpoint will accept once. */
  issueCode(opts: { challenge: string; claims?: IdClaims; nonce?: string }): string;
  /** Signs a JWT with the hub key (or with `foreignKey` to simulate a forged token). */
  sign(claims: IdClaims, opts?: { foreignKey?: boolean; kid?: string; typ?: string }): Promise<string>;
  logoutToken(claims?: IdClaims, opts?: { foreignKey?: boolean }): Promise<string>;
  tokenRequests: { auth: string | undefined; body: URLSearchParams }[];
};

const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function startFakeHub(): Promise<FakeHub> {
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const foreign = await generateKeyPair("RS256", { extractable: true });
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const codes = new Map<string, { challenge: string; claims: IdClaims }>();
  const tokenRequests: FakeHub["tokenRequests"] = [];
  let issuer = "";

  const sign = async (claims: IdClaims, opts: { foreignKey?: boolean; kid?: string; typ?: string } = {}) => {
    const key: KeyLike = opts.foreignKey ? foreign.privateKey : privateKey;
    return new SignJWT(claims as Record<string, unknown>)
      .setProtectedHeader({ alg: "RS256", kid: opts.kid ?? "k1", ...(opts.typ ? { typ: opts.typ } : {}) })
      .sign(key);
  };

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", issuer);
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === "/oidc/.well-known/openid-configuration") {
      return send(200, {
        issuer,
        authorization_endpoint: `${issuer}/auth`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
        end_session_endpoint: `${issuer}/session/end`,
      });
    }
    if (url.pathname === "/oidc/jwks") return send(200, { keys: [jwk] });
    if (url.pathname === "/oidc/token" && req.method === "POST") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", async () => {
        const body = new URLSearchParams(raw);
        tokenRequests.push({ auth: req.headers.authorization, body });
        const expected = `Basic ${Buffer.from(
          `${encodeURIComponent(CLIENT_ID)}:${encodeURIComponent(CLIENT_SECRET).replace(/%20/g, "+")}`,
        ).toString("base64")}`;
        const postAuth = body.get("client_id") === CLIENT_ID && body.get("client_secret") === CLIENT_SECRET;
        if (req.headers.authorization !== expected && !postAuth) return send(401, { error: "invalid_client" });
        const entry = codes.get(body.get("code") ?? "");
        codes.delete(body.get("code") ?? "");
        if (!entry || body.get("redirect_uri") !== REDIRECT_URI) return send(400, { error: "invalid_grant" });
        const verifier = body.get("code_verifier") ?? "";
        if (b64url(createHash("sha256").update(verifier).digest()) !== entry.challenge) {
          return send(400, { error: "invalid_grant", error_description: "PKCE verification failed" });
        }
        const now = Math.floor(Date.now() / 1000);
        const idToken = await sign({ iss: issuer, aud: CLIENT_ID, iat: now, exp: now + 3600, ...entry.claims });
        send(200, { access_token: "at", token_type: "Bearer", expires_in: 3600, id_token: idToken });
      });
      return;
    }
    send(404, { error: "not_found" });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}/oidc`;

  return {
    get issuer() {
      return issuer;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
    issueCode({ challenge, claims, nonce }) {
      const code = b64url(Buffer.from(randomUUID()));
      codes.set(code, {
        challenge,
        claims: {
          sub: "7",
          sid: "hub-sid-1",
          email: "Joana@ifatokun.com.br",
          email_verified: true,
          name: "Joana",
          hub_role: "admin",
          nonce,
          ...claims,
        },
      });
      return code;
    },
    sign,
    async logoutToken(claims = {}, opts = {}) {
      const now = Math.floor(Date.now() / 1000);
      return sign(
        {
          iss: issuer,
          aud: CLIENT_ID,
          iat: now,
          jti: randomUUID(),
          sub: "7",
          sid: "hub-sid-1",
          events: { "http://schemas.openid.net/event/backchannel-logout": {} },
          ...claims,
        },
        { ...opts, typ: "logout+jwt" },
      );
    },
    tokenRequests,
  };
}

export function challengeOf(verifier: string) {
  return b64url(createHash("sha256").update(verifier).digest());
}
