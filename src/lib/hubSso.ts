/**
 * Hub single sign-on ("Login único") for the admin area — browser side.
 *
 * Same file in Gba-Orun, Isesemind and Academy. Project specifics (admin paths, what to run after
 * the session is set) live in src/lib/hubSsoProject.ts. Server side: supabase/functions/hub-sso.
 *
 * Flow: the SPA creates the PKCE verifier, state and nonce (kept in sessionStorage), asks the
 * hub-sso function for the authorization URL, the hub sends the browser back to /auth/hub/callback
 * with a one-time code, and the SPA posts code + verifier + nonce to the function, which holds the
 * client secret and answers with a Supabase session in the response body (never in a URL).
 */

export type HubSsoClientConfig = {
  /** VITE_HUB_SSO_ENABLED=true turns the admin hub login on (off = the app behaves as before). */
  enabled: boolean;
  /** VITE_HUB_ISSUER, e.g. https://hub.ifatokun.com.br/oidc — the only `iss` accepted on entry. */
  issuer: string;
  /** VITE_HUB_SSO_LOCAL_LOGIN=true: emergency fallback, the old admin login works again. */
  localLogin: boolean;
  /** Base URL of the hub-sso Edge Function. */
  functionUrl: string;
  /** Admin area: everything under `adminPrefix`; `adminHome` is where a login lands by default. */
  adminPrefix: string;
  adminHome: string;
};

type Env = Record<string, string | boolean | undefined>;

const trimSlash = (value: string) => value.replace(/\/+$/, "");

export function readHubSsoConfig(env: Env, admin: { prefix: string; home: string }): HubSsoClientConfig {
  const str = (key: string) => (typeof env[key] === "string" ? (env[key] as string).trim() : "");
  const supabaseUrl = trimSlash(str("VITE_SUPABASE_URL"));
  return {
    enabled: str("VITE_HUB_SSO_ENABLED").toLowerCase() === "true",
    issuer: trimSlash(str("VITE_HUB_ISSUER")),
    localLogin: str("VITE_HUB_SSO_LOCAL_LOGIN").toLowerCase() === "true",
    functionUrl: trimSlash(str("VITE_HUB_SSO_FUNCTION_URL")) || `${supabaseUrl}/functions/v1/hub-sso`,
    adminPrefix: admin.prefix,
    adminHome: admin.home,
  };
}

export class HubSsoClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HubSsoClientError";
  }
}

// ------------------------------------------------------------------ entry (third-party initiated login)

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Where to land after login: a same-origin path inside the admin area, else the admin home.
 * Never returns another origin, a protocol-relative URL or a path outside the admin area.
 */
export function resolveAdminTarget(target: string | null | undefined, origin: string, cfg: Pick<HubSsoClientConfig, "adminPrefix" | "adminHome">): string {
  if (!target) return cfg.adminHome;
  let url: URL;
  try {
    url = new URL(target, origin);
  } catch {
    return cfg.adminHome;
  }
  if (url.origin !== origin) return cfg.adminHome;
  if (!isUnder(url.pathname, cfg.adminPrefix)) return cfg.adminHome;
  return `${url.pathname}${url.search}${url.hash}`;
}

export type InitiationResult = { ok: true; next: string; message?: never } | { ok: false; message: string; next?: never };

/** OIDC Core §4: validates `iss` and `target_link_uri` of /auth/hub/iniciar. */
export function validateInitiation(params: URLSearchParams, origin: string, cfg: HubSsoClientConfig): InitiationResult {
  const iss = trimSlash(params.get("iss") ?? "");
  if (!cfg.issuer) return { ok: false, message: "O login pelo Hub não está configurado neste sistema." };
  if (!iss || iss !== cfg.issuer) return { ok: false, message: "Este link de entrada não veio do Hub da Ifatokun." };
  return { ok: true, next: resolveAdminTarget(params.get("target_link_uri"), origin, cfg) };
}

// ------------------------------------------------------------------ PKCE / random values

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

// ------------------------------------------------------------------ storage

const PENDING_KEY = "hub_sso_pending";
const SESSION_KEY = "hub_sso_session";
/** A login started more than this long ago is refused at the callback. */
export const PENDING_TTL_MS = 10 * 60_000;

type Pending = { state: string; nonce: string; verifier: string; next: string; createdAt: number };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStorage(kind: "session" | "local"): StorageLike | null {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(storage: StorageLike | null, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Info about the hub login of the current Supabase session (for "Sair"). */
export type HubSessionInfo = { endSessionUrl: string | null; userId: string };

export function rememberHubSession(info: HubSessionInfo, storage = safeStorage("local")) {
  try {
    storage?.setItem(SESSION_KEY, JSON.stringify(info));
  } catch {
    /* storage blocked: "Sair" then only signs out locally */
  }
}

export function hubSessionInfo(storage = safeStorage("local")): HubSessionInfo | null {
  return readJson<HubSessionInfo>(storage, SESSION_KEY);
}

export function forgetHubSession(storage = safeStorage("local")) {
  try {
    storage?.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------ function calls

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

async function callFunction<T>(fetchFn: FetchFn, url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetchFn(url, init);
  } catch {
    throw new HubSsoClientError("Sem conexão com o servidor. Confira a internet e tente de novo.");
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new HubSsoClientError(typeof body.message === "string" ? body.message : "O login pelo Hub falhou. Tente de novo.");
  }
  return body as T;
}

export type HubServerStatus = { enabled: boolean; roles: string[] };

let statusCache: { at: number; value: Promise<HubServerStatus> } | null = null;

/** Server-side switch and allowed roles (cached 5 min per page load). */
export function fetchHubServerStatus(cfg: HubSsoClientConfig, fetchFn: FetchFn = fetch): Promise<HubServerStatus> {
  if (statusCache && Date.now() - statusCache.at < 5 * 60_000) return statusCache.value;
  const value = callFunction<HubServerStatus>(fetchFn, `${cfg.functionUrl}/status`, { method: "GET" }).then((s) => ({
    enabled: s.enabled === true,
    roles: Array.isArray(s.roles) ? s.roles.filter((r): r is string => typeof r === "string") : [],
  }));
  statusCache = { at: Date.now(), value };
  value.catch(() => {
    statusCache = null;
  });
  return value;
}

/** Starts the hub login and returns the hub URL to open (the caller navigates). */
export async function beginHubLogin(
  cfg: HubSsoClientConfig,
  next: string,
  deps: { fetch?: FetchFn; storage?: StorageLike | null; origin?: string; now?: () => number } = {},
): Promise<string> {
  const storage = deps.storage === undefined ? safeStorage("session") : deps.storage;
  if (!storage) throw new HubSsoClientError("Seu navegador bloqueou o armazenamento desta página. Libere e tente de novo.");
  const origin = deps.origin ?? window.location.origin;
  const verifier = randomToken(32);
  const pending: Pending = {
    state: randomToken(24),
    nonce: randomToken(24),
    verifier,
    next: resolveAdminTarget(next, origin, cfg),
    createdAt: (deps.now ?? Date.now)(),
  };
  const { authorization_url } = await callFunction<{ authorization_url: string }>(deps.fetch ?? fetch, `${cfg.functionUrl}/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code_challenge: await pkceChallenge(verifier), state: pending.state, nonce: pending.nonce }),
  });
  // The hub must be the configured issuer: never follow an authorization URL elsewhere.
  if (!cfg.issuer || !authorization_url?.startsWith(`${cfg.issuer}/`)) {
    throw new HubSsoClientError("O servidor devolveu um endereço de login inesperado.");
  }
  storage.setItem(PENDING_KEY, JSON.stringify(pending));
  return authorization_url;
}

export type MintedSession = { access_token: string; refresh_token: string; expires_in: number; expires_at?: number; token_type: string };
export type HubLoginResult = { session: MintedSession; endSessionUrl: string | null; userId: string; next: string };

const HUB_ERRORS: Record<string, string> = {
  access_denied: "O Hub não liberou este sistema para você.",
  login_required: "Entre no Hub e abra o sistema de novo.",
  interaction_required: "Entre no Hub e abra o sistema de novo.",
};

/** Handles /auth/hub/callback: one-time pending state, state check, code exchange. */
export async function finishHubLogin(
  cfg: HubSsoClientConfig,
  search: string,
  deps: { fetch?: FetchFn; storage?: StorageLike | null; now?: () => number } = {},
): Promise<HubLoginResult> {
  const storage = deps.storage === undefined ? safeStorage("session") : deps.storage;
  const pending = readJson<Pending>(storage, PENDING_KEY);
  // One-time: whatever happens next, this pending login cannot be replayed.
  try {
    storage?.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }

  const params = new URLSearchParams(search);
  const hubError = params.get("error");
  if (hubError) {
    throw new HubSsoClientError(HUB_ERRORS[hubError] ?? `O Hub recusou o login (${hubError}).`);
  }
  if (!pending) throw new HubSsoClientError("Este login expirou ou foi aberto em outra aba. Tente de novo.");
  if ((deps.now ?? Date.now)() - pending.createdAt > PENDING_TTL_MS) {
    throw new HubSsoClientError("Este login expirou. Tente de novo.");
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || state !== pending.state) {
    throw new HubSsoClientError("A resposta do Hub não confere com este navegador. Tente de novo.");
  }
  const body = await callFunction<{ session: MintedSession; end_session_url: string | null; user: { id: string } }>(
    deps.fetch ?? fetch,
    `${cfg.functionUrl}/exchange`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, code_verifier: pending.verifier, nonce: pending.nonce }),
    },
  );
  if (!body.session?.access_token || !body.session.refresh_token || !body.user?.id) {
    throw new HubSsoClientError("O servidor não devolveu a sessão. Tente de novo.");
  }
  return { session: body.session, endSessionUrl: body.end_session_url ?? null, userId: body.user.id, next: pending.next };
}

/** Decides what the admin guard does with the current session. */
export type GuardDecision = "allow" | "login" | "relogin" | "error";

export function decideAccess(input: {
  cfg: Pick<HubSsoClientConfig, "enabled" | "localLogin">;
  server: HubServerStatus | "unreachable";
  hasSession: boolean;
  session: { status: "active" | "revoked" | "none"; roles: string[] } | "unknown";
}): GuardDecision {
  const { cfg, server } = input;
  if (!cfg.enabled) return "allow";
  if (server === "unreachable") return cfg.localLogin ? "allow" : "error";
  if (!server.enabled) return "allow"; // switched off on the server (emergency): old behaviour
  if (!input.hasSession) return cfg.localLogin ? "allow" : "login";
  if (input.session === "unknown") return cfg.localLogin ? "allow" : "error";
  if (input.session.status === "active") return "allow";
  if (input.session.status === "revoked") return "relogin";
  // A normal (password) session: people with a hub-managed role must come through the hub;
  // everyone else (students, other roles) keeps the app's own rules.
  const hubManaged = input.session.roles.some((role) => server.roles.includes(role));
  return hubManaged && !cfg.localLogin ? "login" : "allow";
}
