/**
 * Hub single sign-on ("Login único") for the ADMIN area — framework-free core.
 *
 * The same files live in Gba-Orun, Isesemind and Academy under
 * supabase/functions/_shared/hub-sso/. Keep them identical across projects; only the SQL
 * migration (which roles count as "admin") and the SPA wiring differ per project.
 *
 * This module has no runtime imports, so it runs unchanged in the Supabase Edge Runtime (Deno)
 * and in the Node unit tests (Vitest).
 */

export const BACKCHANNEL_EVENT = "http://schemas.openid.net/event/backchannel-logout";
export const SCOPES = "openid email profile";
/** How old a back-channel logout token may be (seconds). */
export const LOGOUT_TOKEN_MAX_AGE = 300;
/** Clock skew tolerated when checking exp/iat (seconds). */
export const CLOCK_TOLERANCE = 30;

export type TokenAuthMethod = "client_secret_basic" | "client_secret_post";

export type HubSsoConfig = {
  /** Server-side switch (Supabase secret HUB_SSO_ENABLED). Off = every endpoint answers "disabled". */
  enabled: boolean;
  /** Hub issuer, e.g. https://hub.ifatokun.com.br/oidc (no trailing slash). */
  issuer: string;
  clientId: string;
  clientSecret: string;
  tokenAuthMethod: TokenAuthMethod;
  /** Public origin of the SPA, e.g. https://gba-orun.ifatokun.com.br. */
  appUrl: string;
  /** SPA route that receives ?code=&state= from the hub. */
  callbackPath: string;
  /** SPA route the hub sends people to after "Sair". */
  postLogoutPath: string;
  /** Project roles (see the hub_sso_user_roles SQL function) that may sign in through the hub. */
  allowedRoles: string[];
  /**
   * After a hub login, replace the user's Supabase password with a random one (HUB_SSO_LOCK_PASSWORD,
   * default true), so an admin cannot skip the hub by signing in to Supabase Auth directly with the
   * public anon key. The emergency fallback then needs "Esqueci a senha".
   */
  lockPassword: boolean;
  /** Names of required settings that are missing or invalid (empty = ready). */
  problems: string[];
};

/** An error whose `message` is safe to show to the person (pt-BR). */
export class HubSsoError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "HubSsoError";
    this.code = code;
    this.status = status;
  }
}

const trimSlash = (value: string) => value.replace(/\/+$/, "");

/** True for https URLs, and for http only on localhost (local development). */
export function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

function routePath(value: string | undefined, fallback: string): string {
  const path = (value ?? "").trim() || fallback;
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

/** Reads the settings from the environment (Supabase secrets in production). */
export function loadConfig(get: (name: string) => string | undefined): HubSsoConfig {
  const read = (name: string) => (get(name) ?? "").trim();
  const problems: string[] = [];

  const issuer = trimSlash(read("HUB_ISSUER"));
  if (!isAllowedUrl(issuer)) problems.push("HUB_ISSUER");
  const clientId = read("HUB_CLIENT_ID");
  if (!clientId) problems.push("HUB_CLIENT_ID");
  const clientSecret = read("HUB_CLIENT_SECRET");
  if (!clientSecret) problems.push("HUB_CLIENT_SECRET");

  const rawAppUrl = read("HUB_SSO_APP_URL");
  let appUrl = "";
  if (isAllowedUrl(rawAppUrl)) appUrl = new URL(rawAppUrl).origin;
  else problems.push("HUB_SSO_APP_URL");

  const method = read("HUB_SSO_TOKEN_AUTH_METHOD") || "client_secret_basic";
  if (method !== "client_secret_basic" && method !== "client_secret_post") problems.push("HUB_SSO_TOKEN_AUTH_METHOD");

  const allowedRoles = (read("HUB_SSO_ALLOWED_ROLES") || "admin")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  if (!allowedRoles.length) problems.push("HUB_SSO_ALLOWED_ROLES");

  return {
    enabled: read("HUB_SSO_ENABLED").toLowerCase() === "true",
    issuer,
    clientId,
    clientSecret,
    tokenAuthMethod: method as TokenAuthMethod,
    appUrl,
    callbackPath: routePath(get("HUB_SSO_CALLBACK_PATH"), "/auth/hub/callback"),
    postLogoutPath: routePath(get("HUB_SSO_POST_LOGOUT_PATH"), "/"),
    allowedRoles,
    lockPassword: read("HUB_SSO_LOCK_PASSWORD").toLowerCase() !== "false",
    problems,
  };
}

export const redirectUri = (config: HubSsoConfig) => `${config.appUrl}${config.callbackPath}`;
export const postLogoutRedirectUri = (config: HubSsoConfig) => `${config.appUrl}${config.postLogoutPath}`;

// ---------------------------------------------------------------- input validation

const B64URL = /^[A-Za-z0-9_-]+$/;
/** PKCE S256 challenge: base64url of a SHA-256 digest (43 chars). */
export const isCodeChallenge = (v: unknown): v is string => typeof v === "string" && v.length === 43 && B64URL.test(v);
/** state / nonce generated by the SPA: 22..128 base64url chars (>= 128 bits). */
export const isRandomToken = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 22 && v.length <= 128 && B64URL.test(v);
/** RFC 7636 code_verifier. */
export const isCodeVerifier = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9\-._~]{43,128}$/.test(v);
/** Authorization code as issued by the hub (opaque, printable, bounded). */
export const isAuthorizationCode = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9\-._~]{8,512}$/.test(v);

// ---------------------------------------------------------------- discovery

export type ProviderMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
};

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchDiscovery(fetchFn: FetchFn, issuer: string): Promise<ProviderMetadata> {
  let res: Response;
  try {
    res = await fetchFn(`${issuer}/.well-known/openid-configuration`, { headers: { accept: "application/json" } });
  } catch {
    throw new HubSsoError("hub_unavailable", 502, "O Hub não respondeu. Tente de novo em instantes.");
  }
  if (!res.ok) throw new HubSsoError("hub_unavailable", 502, "O Hub não respondeu. Tente de novo em instantes.");
  const meta = (await res.json()) as Partial<ProviderMetadata>;
  // OIDC Discovery §4.3: the issuer in the document must be exactly the configured one.
  if (meta.issuer !== issuer) throw new HubSsoError("issuer_mismatch", 502, "O endereço do Hub configurado não confere.");
  for (const key of ["authorization_endpoint", "token_endpoint", "jwks_uri"] as const) {
    if (typeof meta[key] !== "string" || !isAllowedUrl(meta[key] as string)) {
      throw new HubSsoError("hub_misconfigured", 502, "O Hub respondeu com uma configuração inválida.");
    }
  }
  return meta as ProviderMetadata;
}

/** Caches the discovery document per isolate (10 min); a failure is not cached. */
export function discoveryCache(fetchFn: FetchFn, issuer: string, ttlMs = 10 * 60_000, now = () => Date.now()) {
  let cached: { at: number; value: Promise<ProviderMetadata> } | null = null;
  return (): Promise<ProviderMetadata> => {
    if (cached && now() - cached.at < ttlMs) return cached.value;
    const value = fetchDiscovery(fetchFn, issuer).catch((err) => {
      cached = null;
      throw err;
    });
    cached = { at: now(), value };
    return value;
  };
}

// ---------------------------------------------------------------- authorization request

export function buildAuthorizationUrl(
  meta: ProviderMetadata,
  config: HubSsoConfig,
  params: { codeChallenge: string; state: string; nonce: string },
): string {
  const url = new URL(meta.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri(config));
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  return url.toString();
}

/** RP-initiated logout ("Sair"): the hub asks "Sair de todos os sistemas?" and comes back. */
export function buildEndSessionUrl(meta: ProviderMetadata, config: HubSsoConfig): string | null {
  if (!meta.end_session_endpoint) return null;
  const url = new URL(meta.end_session_endpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri(config));
  return url.toString();
}

// ---------------------------------------------------------------- token endpoint

/** RFC 6749 §2.3.1: client id and secret are form-encoded before the Basic header. */
export function basicAuthHeader(clientId: string, clientSecret: string): string {
  const enc = (v: string) => encodeURIComponent(v).replace(/%20/g, "+");
  return `Basic ${btoa(`${enc(clientId)}:${enc(clientSecret)}`)}`;
}

export async function exchangeCode(
  fetchFn: FetchFn,
  meta: ProviderMetadata,
  config: HubSsoConfig,
  params: { code: string; codeVerifier: string },
): Promise<{ idToken: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: redirectUri(config),
    code_verifier: params.codeVerifier,
  });
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  if (config.tokenAuthMethod === "client_secret_post") {
    body.set("client_id", config.clientId);
    body.set("client_secret", config.clientSecret);
  } else {
    headers.authorization = basicAuthHeader(config.clientId, config.clientSecret);
  }

  let res: Response;
  try {
    res = await fetchFn(meta.token_endpoint, { method: "POST", headers, body: body.toString() });
  } catch {
    throw new HubSsoError("hub_unavailable", 502, "O Hub não respondeu. Tente de novo em instantes.");
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (json.error === "invalid_grant") {
      throw new HubSsoError("invalid_grant", 400, "Este login já foi usado ou expirou. Abra o sistema de novo pelo Hub.");
    }
    if (json.error === "invalid_client") {
      throw new HubSsoError("invalid_client", 502, "O login único deste sistema está mal configurado no Hub.");
    }
    throw new HubSsoError("token_error", 502, "O Hub recusou o login. Tente de novo.");
  }
  if (typeof json.id_token !== "string") throw new HubSsoError("token_error", 502, "O Hub não enviou a identidade.");
  return { idToken: json.id_token };
}

// ---------------------------------------------------------------- ID token / logout token

/** Verifies signature (JWKS), iss, aud, exp/nbf and, when maxTokenAgeSec is set, iat. Throws on failure. */
export type JwtVerifier = (
  token: string,
  options: { audience: string; maxTokenAgeSec?: number; requiredClaims?: string[] },
) => Promise<Record<string, unknown>>;

export type HubIdentity = {
  sub: string;
  sid: string;
  email: string;
  name: string | null;
  hubRole: string | null;
};

/** Claims checks that come after the signature/iss/aud/exp verification. */
export function identityFromIdToken(
  payload: Record<string, unknown>,
  config: Pick<HubSsoConfig, "clientId">,
  expectedNonce: string,
): HubIdentity {
  const invalid = () => new HubSsoError("invalid_id_token", 400, "A identidade enviada pelo Hub é inválida.");
  if (typeof payload.nonce !== "string" || payload.nonce !== expectedNonce) throw invalid();
  // OIDC Core §3.1.3.7: with several audiences, azp must be this client.
  if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== config.clientId) throw invalid();
  if (payload.azp !== undefined && payload.azp !== config.clientId) throw invalid();
  if (typeof payload.sub !== "string" || !payload.sub) throw invalid();
  if (typeof payload.email !== "string" || !payload.email.includes("@")) {
    throw new HubSsoError("missing_email", 400, "O Hub não enviou o e-mail. Confira o escopo \"email\" do sistema no Hub.");
  }
  if (payload.email_verified !== true) throw new HubSsoError("email_not_verified", 403, "O e-mail da sua conta no Hub não está confirmado.");
  // The sid is what back-channel logout sends; without it the hub could not sign this session out.
  if (typeof payload.sid !== "string" || !payload.sid) {
    throw new HubSsoError("missing_sid", 502, "O Hub não enviou o id da sessão. Cadastre a URL de logout (back-channel) do sistema no Hub.");
  }
  return {
    sub: payload.sub,
    sid: payload.sid,
    email: payload.email.trim().toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : null,
    hubRole: typeof payload.hub_role === "string" ? payload.hub_role : null,
  };
}

/** OIDC Back-Channel Logout 1.0 §2.6 checks (after signature/iss/aud/iat verification). */
export function logoutTargetFromToken(payload: Record<string, unknown>): { sid: string | null; sub: string | null } {
  const invalid = () => new HubSsoError("invalid_logout_token", 400, "invalid logout token");
  const events = payload.events;
  if (!events || typeof events !== "object" || Array.isArray(events)) throw invalid();
  const event = (events as Record<string, unknown>)[BACKCHANNEL_EVENT];
  if (!event || typeof event !== "object") throw invalid();
  if ("nonce" in payload) throw invalid();
  const sid = typeof payload.sid === "string" && payload.sid ? payload.sid : null;
  const sub = typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  if (!sid && !sub) throw invalid();
  return { sid, sub };
}

/** A password nobody knows (256+ bits), shaped to pass any Supabase password policy. */
export function randomPassword(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}Aa1!`;
}

/** Reads a claim from a JWT we just received from Supabase Auth (no verification: it is our own). */
export function unverifiedJwtClaim(token: string, claim: string): unknown {
  const part = token.split(".")[1];
  if (!part) return undefined;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    return (JSON.parse(json) as Record<string, unknown>)[claim];
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------- user mapping

export type FindUserResult = { status: "ok"; userId: string } | { status: "no_user" | "no_role" | "banned" | "unconfirmed" };

export type MintedSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
};

/** Everything the flow needs from Supabase (implemented in store.ts, mocked in tests). */
export type HubSsoStore = {
  /** Looks up an EXISTING user by e-mail and checks the allowed roles. Never creates anything. */
  findUser(email: string, roles: string[]): Promise<FindUserResult>;
  /** Creates a Supabase Auth session for that existing user (no e-mail is sent). */
  mintSession(email: string, userId: string): Promise<MintedSession>;
  /** Links the Supabase session to the hub session (sid) for back-channel logout. */
  recordSession(row: { authSessionId: string; userId: string; hubSid: string; hubSub: string; hubEmail: string }): Promise<void>;
  /** Replaces the user's Supabase password with a long random one (see HubSsoConfig.lockPassword). */
  lockPassword(userId: string): Promise<void>;
  /**
   * Ends the user's Supabase sessions that were NOT opened through the hub (password, reset or
   * magic link), keeping the hub ones. Runs with lockPassword: the password is gone, so a session
   * someone opened with it (or with a reset e-mail) must not outlive the switch to the hub.
   */
  endLocalSessions(userId: string): Promise<number>;
  /** Revokes every Supabase session linked to the hub sid (or to the hub sub when sid is null). */
  revoke(target: { sid: string | null; sub: string | null }): Promise<number>;
};

export function refusalFor(status: Exclude<FindUserResult["status"], "ok">, email: string): HubSsoError {
  if (status === "no_user") {
    return new HubSsoError(
      "unknown_user",
      403,
      `Não há usuário com o e-mail ${email} neste sistema. Peça a um administrador para cadastrar esse e-mail e dar a ele acesso de administrador.`,
    );
  }
  if (status === "unconfirmed") {
    return new HubSsoError("unconfirmed_user", 403, `O e-mail ${email} ainda não foi confirmado neste sistema. Confirme o e-mail e tente de novo.`);
  }
  if (status === "banned") return new HubSsoError("banned_user", 403, `O usuário ${email} está bloqueado neste sistema.`);
  return new HubSsoError(
    "not_admin",
    403,
    `O usuário ${email} existe neste sistema, mas não tem acesso de administrador. Peça a um administrador para liberar.`,
  );
}

export type ExchangeResult = {
  session: MintedSession;
  endSessionUrl: string | null;
  user: { id: string; email: string; name: string | null };
};

/**
 * The whole callback: code -> hub tokens (with secret + PKCE) -> verified identity -> existing admin
 * -> Supabase session, recorded under the hub sid. Fails closed at every step.
 */
export async function completeLogin(
  deps: { config: HubSsoConfig; fetch: FetchFn; discovery: () => Promise<ProviderMetadata>; verify: JwtVerifier; store: HubSsoStore },
  input: { code: string; codeVerifier: string; nonce: string },
): Promise<ExchangeResult> {
  const meta = await deps.discovery();
  const { idToken } = await exchangeCode(deps.fetch, meta, deps.config, input);
  let payload: Record<string, unknown>;
  try {
    payload = await deps.verify(idToken, { audience: deps.config.clientId, requiredClaims: ["iat", "exp", "sub"] });
  } catch {
    throw new HubSsoError("invalid_id_token", 400, "A identidade enviada pelo Hub é inválida.");
  }
  const identity = identityFromIdToken(payload, deps.config, input.nonce);

  const found = await deps.store.findUser(identity.email, deps.config.allowedRoles);
  if (found.status !== "ok") throw refusalFor(found.status, identity.email);

  const session = await deps.store.mintSession(identity.email, found.userId);
  const authSessionId = unverifiedJwtClaim(session.access_token, "session_id");
  const tokenSub = unverifiedJwtClaim(session.access_token, "sub");
  if (typeof authSessionId !== "string" || tokenSub !== found.userId) {
    throw new HubSsoError("session_error", 500, "Não foi possível abrir a sessão. Tente de novo.");
  }
  await deps.store.recordSession({
    authSessionId,
    userId: found.userId,
    hubSid: identity.sid,
    hubSub: identity.sub,
    hubEmail: identity.email,
  });
  if (deps.config.lockPassword) {
    await deps.store.lockPassword(found.userId);
    await deps.store.endLocalSessions(found.userId);
  }
  return {
    session,
    endSessionUrl: buildEndSessionUrl(meta, deps.config),
    user: { id: found.userId, email: identity.email, name: identity.name },
  };
}

/** Back-channel logout: verify the logout token and revoke the linked Supabase sessions. */
export async function backchannelLogout(
  deps: { config: HubSsoConfig; verify: JwtVerifier; store: HubSsoStore },
  logoutToken: string,
): Promise<number> {
  if (!logoutToken) throw new HubSsoError("invalid_logout_token", 400, "missing logout_token");
  let payload: Record<string, unknown>;
  try {
    payload = await deps.verify(logoutToken, {
      audience: deps.config.clientId,
      maxTokenAgeSec: LOGOUT_TOKEN_MAX_AGE,
      requiredClaims: ["iat", "jti", "events"],
    });
  } catch {
    throw new HubSsoError("invalid_logout_token", 400, "invalid logout token");
  }
  return deps.store.revoke(logoutTargetFromToken(payload));
}
