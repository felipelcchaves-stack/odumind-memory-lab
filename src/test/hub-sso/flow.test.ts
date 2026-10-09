// @vitest-environment node
/**
 * hub-sso Edge Function, end to end in Node: real HTTP to a fake OIDC provider, real RS256 JWTs
 * verified by jose against its JWKS, Supabase replaced by an in-memory store.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateKeyPair, SignJWT } from "jose";
import { discoveryCache, loadConfig, type HubSsoStore } from "../../../supabase/functions/_shared/hub-sso/core.ts";
import { createHubSsoHandler } from "../../../supabase/functions/_shared/hub-sso/handler.ts";
import { createJwtVerifier } from "../../../supabase/functions/_shared/hub-sso/verifier.ts";
import { APP_URL, CLIENT_ID, CLIENT_SECRET, challengeOf, startFakeHub, type FakeHub } from "./fakeHub";

const VERIFIER = "v".repeat(20) + "-verifier-0123456789_abcdefghijklmnop";
const NONCE = "nonce-0123456789abcdefghij";
const STATE = "state-0123456789abcdefghij";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";

/** A Supabase-like access token (unsigned is fine: it comes from our own Supabase in production). */
function fakeAccessToken(sub: string, sessionId: string) {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc({ sub, session_id: sessionId, role: "authenticated" })}.sig`;
}

type Recorded = Parameters<HubSsoStore["recordSession"]>[0];

function memoryStore() {
  const users = new Map<string, { id: string; roles: string[]; banned?: boolean; unconfirmed?: boolean }>([
    ["joana@ifatokun.com.br", { id: ADMIN_ID, roles: ["admin"] }],
    ["aluno@ifatokun.com.br", { id: "22222222-2222-4222-8222-222222222222", roles: ["user"] }],
    ["bloqueado@ifatokun.com.br", { id: "33333333-3333-4333-8333-333333333333", roles: ["admin"], banned: true }],
    ["novo@ifatokun.com.br", { id: "44444444-4444-4444-8444-444444444444", roles: ["admin"], unconfirmed: true }],
  ]);
  const state = { locked: [] as string[], minted: [] as string[], recorded: [] as Recorded[], revoked: [] as { sid: string | null; sub: string | null }[] };
  const store: HubSsoStore = {
    async findUser(email, roles) {
      const user = users.get(email);
      if (!user) return { status: "no_user" };
      if (user.unconfirmed) return { status: "unconfirmed" };
      if (user.banned) return { status: "banned" };
      return user.roles.some((r) => roles.includes(r)) ? { status: "ok", userId: user.id } : { status: "no_role" };
    },
    async mintSession(email, userId) {
      state.minted.push(email);
      return {
        access_token: fakeAccessToken(userId, `aaaaaaaa-0000-4000-8000-00000000000${state.minted.length}`),
        refresh_token: "refresh-" + state.minted.length,
        expires_in: 3600,
        token_type: "bearer",
      };
    },
    async recordSession(row) {
      state.recorded.push(row);
    },
    async lockPassword(userId) {
      state.locked.push(userId);
    },
    async revoke(target) {
      state.revoked.push(target);
      return state.recorded.filter((r) => r.hubSid === target.sid).length;
    },
  };
  return { store, state };
}

let hub: FakeHub;
beforeAll(async () => {
  hub = await startFakeHub();
});
afterAll(async () => {
  await hub.close();
});

function makeHandler(overrides: Record<string, string> = {}) {
  const env: Record<string, string> = {
    HUB_SSO_ENABLED: "true",
    HUB_ISSUER: hub.issuer,
    HUB_CLIENT_ID: CLIENT_ID,
    HUB_CLIENT_SECRET: CLIENT_SECRET,
    HUB_SSO_APP_URL: APP_URL,
    HUB_SSO_ALLOWED_ROLES: "admin",
    ...overrides,
  };
  const config = loadConfig((k) => env[k]);
  const discovery = discoveryCache(fetch, config.issuer);
  const mem = memoryStore();
  const handler = createHubSsoHandler({ config, fetch, discovery, verify: createJwtVerifier(config.issuer, discovery), store: mem.store });
  return { handler, ...mem };
}

const post = (path: string, body: unknown, origin: string | null = APP_URL) =>
  new Request(`https://ref.supabase.co/functions/v1/hub-sso/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });

const backchannel = (token: string) =>
  new Request("https://ref.supabase.co/functions/v1/hub-sso/backchannel-logout", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ logout_token: token }).toString(),
  });

describe("start", () => {
  it("builds the hub authorization URL with PKCE S256, state, nonce and the SPA callback", async () => {
    const { handler } = makeHandler();
    const res = await handler(post("start", { code_challenge: challengeOf(VERIFIER), state: STATE, nonce: NONCE }));
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(APP_URL);
    const url = new URL(((await res.json()) as { authorization_url: string }).authorization_url);
    expect(`${url.origin}${url.pathname}`).toBe(`${hub.issuer}/auth`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: `${APP_URL}/auth/hub/callback`,
      scope: "openid email profile",
      code_challenge: challengeOf(VERIFIER),
      code_challenge_method: "S256",
      state: STATE,
      nonce: NONCE,
    });
    expect(url.toString()).not.toContain(encodeURIComponent(CLIENT_SECRET));
  });

  it("refuses other origins, bad input and a disabled or unconfigured server", async () => {
    const { handler } = makeHandler();
    const good = { code_challenge: challengeOf(VERIFIER), state: STATE, nonce: NONCE };
    expect((await handler(post("start", good, "https://evil.example"))).status).toBe(403);
    expect((await handler(post("start", { ...good, code_challenge: "short" }))).status).toBe(400);
    expect((await handler(post("start", { ...good, state: "tiny" }))).status).toBe(400);
    expect((await makeHandler({ HUB_SSO_ENABLED: "false" }).handler(post("start", good))).status).toBe(503);
    expect((await makeHandler({ HUB_CLIENT_SECRET: "" }).handler(post("start", good))).status).toBe(503);
    expect((await makeHandler({ HUB_ISSUER: "http://hub.example/oidc" }).handler(post("start", good))).status).toBe(503);
  });

  it("answers the CORS preflight only for the SPA origin", async () => {
    const { handler } = makeHandler();
    const pre = (origin: string) =>
      handler(new Request("https://ref.supabase.co/functions/v1/hub-sso/exchange", { method: "OPTIONS", headers: { origin } }));
    expect((await pre(APP_URL)).headers.get("access-control-allow-origin")).toBe(APP_URL);
    expect((await pre("https://evil.example")).headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("status", () => {
  it("exposes only the switch and the allowed roles", async () => {
    const res = await makeHandler({ HUB_SSO_ALLOWED_ROLES: "admin, colaborador" }).handler(
      new Request("https://ref.supabase.co/functions/v1/hub-sso/status", { headers: { origin: APP_URL } }),
    );
    expect(await res.json()).toEqual({ enabled: true, roles: ["admin", "colaborador"] });
  });
});

describe("exchange (callback)", () => {
  const exchange = (h: ReturnType<typeof makeHandler>, code: string, extra: Record<string, unknown> = {}) =>
    h.handler(post("exchange", { code, code_verifier: VERIFIER, nonce: NONCE, ...extra }));

  it("signs an existing admin in, records the hub sid and returns the session in the body", async () => {
    const h = makeHandler();
    const code = hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE });
    const res = await exchange(h, code);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { session: { refresh_token: string }; end_session_url: string; user: { id: string } };
    expect(body.session.refresh_token).toBe("refresh-1");
    expect(body.user.id).toBe(ADMIN_ID);
    const end = new URL(body.end_session_url);
    expect(`${end.origin}${end.pathname}`).toBe(`${hub.issuer}/session/end`);
    expect(end.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(end.searchParams.get("post_logout_redirect_uri")).toBe(`${APP_URL}/`);
    expect(h.state.minted).toEqual(["joana@ifatokun.com.br"]);
    // The Supabase password is replaced, so the hub cannot be skipped with the anon key.
    expect(h.state.locked).toEqual([ADMIN_ID]);
    expect(h.state.recorded).toEqual([
      {
        authSessionId: "aaaaaaaa-0000-4000-8000-000000000001",
        userId: ADMIN_ID,
        hubSid: "hub-sid-1",
        hubSub: "7",
        hubEmail: "joana@ifatokun.com.br",
      },
    ]);
    // Confidential client: secret in the Basic header, PKCE verifier sent.
    const last = hub.tokenRequests.at(-1)!;
    expect(last.auth).toMatch(/^Basic /);
    expect(last.body.get("code_verifier")).toBe(VERIFIER);
  });

  it("keeps the password when HUB_SSO_LOCK_PASSWORD=false", async () => {
    const h = makeHandler({ HUB_SSO_LOCK_PASSWORD: "false" });
    expect((await exchange(h, hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE }))).status).toBe(200);
    expect(h.state.locked).toEqual([]);
  });

  it("supports client_secret_post", async () => {
    const h = makeHandler({ HUB_SSO_TOKEN_AUTH_METHOD: "client_secret_post" });
    const res = await exchange(h, hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE }));
    expect(res.status).toBe(200);
    expect(hub.tokenRequests.at(-1)!.auth).toBeUndefined();
  });

  it("a code works once", async () => {
    const h = makeHandler();
    const code = hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE });
    expect((await exchange(h, code)).status).toBe(200);
    const again = await exchange(h, code);
    expect(again.status).toBe(400);
    expect(((await again.json()) as { error: string }).error).toBe("invalid_grant");
  });

  it("refuses a wrong PKCE verifier", async () => {
    const h = makeHandler();
    const code = hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE });
    const res = await exchange(h, code, { code_verifier: "w".repeat(43) });
    expect(res.status).toBe(400);
    expect(h.state.minted).toEqual([]);
  });

  it.each([
    ["another nonce", { nonce: "nonce-of-another-login-attempt" }],
    ["another audience", { aud: "hub-1-other-system" }],
    ["several audiences without azp", { aud: [CLIENT_ID, "hub-1-other"] }],
    ["another issuer", { iss: "https://evil.example/oidc" }],
    ["an expired token", { exp: Math.floor(Date.now() / 1000) - 3600, iat: Math.floor(Date.now() / 1000) - 7200 }],
  ])("refuses an ID token with %s", async (_label, claims) => {
    const h = makeHandler();
    const res = await exchange(h, hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE, claims }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_id_token");
    expect(h.state.minted).toEqual([]);
  });

  it("refuses an unverified e-mail and a token without sid", async () => {
    const h = makeHandler();
    let res = await exchange(h, hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE, claims: { email_verified: false } }));
    expect(res.status).toBe(403);
    res = await exchange(h, hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE, claims: { sid: undefined } }));
    expect(((await res.json()) as { error: string }).error).toBe("missing_sid");
    expect(h.state.minted).toEqual([]);
  });

  it.each([
    ["ninguem@ifatokun.com.br", "unknown_user", /Não há usuário com o e-mail ninguem@ifatokun.com.br/],
    ["aluno@ifatokun.com.br", "not_admin", /não tem acesso de administrador/],
    ["bloqueado@ifatokun.com.br", "banned_user", /bloqueado/],
    ["novo@ifatokun.com.br", "unconfirmed_user", /ainda não foi confirmado/],
  ])("refuses %s with a clear message and never creates a session", async (email, code, message) => {
    const h = makeHandler();
    const res = await exchange(h, hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE, claims: { email } }));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe(code);
    expect(body.message).toMatch(message);
    expect(h.state.minted).toEqual([]);
    expect(h.state.recorded).toEqual([]);
    expect(h.state.locked).toEqual([]);
  });

  it("honours HUB_SSO_ALLOWED_ROLES", async () => {
    const h = makeHandler({ HUB_SSO_ALLOWED_ROLES: "user" });
    const res = await exchange(h, hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE }));
    expect(res.status).toBe(403);
  });

  it("refuses malformed input before calling the hub", async () => {
    const h = makeHandler();
    const before = hub.tokenRequests.length;
    expect((await exchange(h, "a b c")).status).toBe(400);
    expect((await exchange(h, "validcode123", { code_verifier: "short" })).status).toBe(400);
    expect((await exchange(h, "validcode123", { nonce: undefined })).status).toBe(400);
    expect(hub.tokenRequests.length).toBe(before);
  });
});

describe("back-channel logout", () => {
  it("revokes the sessions of the hub sid", async () => {
    const h = makeHandler();
    await h.handler(post("exchange", { code: hub.issueCode({ challenge: challengeOf(VERIFIER), nonce: NONCE }), code_verifier: VERIFIER, nonce: NONCE }));
    const res = await h.handler(backchannel(await hub.logoutToken()));
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(h.state.revoked).toEqual([{ sid: "hub-sid-1", sub: "7" }]);
  });

  it("works with the server switch off (logging out is always safe)", async () => {
    const h = makeHandler({ HUB_SSO_ENABLED: "false" });
    expect((await h.handler(backchannel(await hub.logoutToken()))).status).toBe(200);
  });

  it.each([
    ["a forged signature", {}, { foreignKey: true }],
    ["another audience", { aud: "hub-1-other" }, {}],
    ["another issuer", { iss: "https://evil.example/oidc" }, {}],
    ["an old iat", { iat: Math.floor(Date.now() / 1000) - 3600 }, {}],
    ["no logout event", { events: { "urn:other": {} } }, {}],
    ["a nonce", { nonce: "n" }, {}],
    ["no sid nor sub", { sid: undefined, sub: undefined }, {}],
    ["no jti", { jti: undefined }, {}],
  ])("rejects a logout token with %s", async (_label, claims, opts) => {
    const h = makeHandler();
    const res = await h.handler(backchannel(await hub.logoutToken(claims, opts)));
    expect(res.status).toBe(400);
    expect(h.state.revoked).toEqual([]);
  });

  it("rejects an ID token posted as a logout token and a missing token", async () => {
    const h = makeHandler();
    const now = Math.floor(Date.now() / 1000);
    const idToken = await hub.sign({ iss: hub.issuer, aud: CLIENT_ID, iat: now, exp: now + 60, sub: "7", sid: "hub-sid-1", nonce: NONCE });
    expect((await h.handler(backchannel(idToken))).status).toBe(400);
    expect((await h.handler(backchannel(""))).status).toBe(400);
    expect(h.state.revoked).toEqual([]);
  });

  it("rejects a token signed with another algorithm and key", async () => {
    const h = makeHandler();
    const { privateKey } = await generateKeyPair("ES256");
    const es = await new SignJWT({ iss: hub.issuer, aud: CLIENT_ID, sid: "x", events: { "http://schemas.openid.net/event/backchannel-logout": {} } })
      .setProtectedHeader({ alg: "ES256", kid: "k1" })
      .setIssuedAt()
      .setJti("j")
      .sign(privateKey);
    expect((await h.handler(backchannel(es))).status).toBe(400);
  });
});

describe("routing", () => {
  let h: ReturnType<typeof makeHandler>;
  beforeEach(() => {
    h = makeHandler();
  });
  it("404 for unknown routes and 405 for wrong methods", async () => {
    expect((await h.handler(new Request("https://ref.supabase.co/functions/v1/hub-sso/nope"))).status).toBe(404);
    expect((await h.handler(new Request("https://ref.supabase.co/functions/v1/hub-sso/start"))).status).toBe(405);
    expect((await h.handler(post("status", {}))).status).toBe(405);
  });
});
