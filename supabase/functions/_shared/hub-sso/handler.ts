/**
 * HTTP surface of the hub-sso Edge Function (one function, four routes):
 *
 *   GET  …/hub-sso/status              {enabled, roles}            (SPA, CORS: HUB_SSO_APP_URL only)
 *   POST …/hub-sso/start               {code_challenge,state,nonce} -> {authorization_url}
 *   POST …/hub-sso/exchange            {code,code_verifier,nonce}  -> {session,end_session_url,user}
 *   POST …/hub-sso/backchannel-logout  logout_token=…  (hub -> server, no CORS, no cookie)
 *
 * The SPA keeps the PKCE verifier, state and nonce in sessionStorage; this function keeps the
 * client secret. Tokens only travel in POST bodies, never in URLs.
 */
import {
  HubSsoError,
  backchannelLogout,
  buildAuthorizationUrl,
  completeLogin,
  isAuthorizationCode,
  isCodeChallenge,
  isCodeVerifier,
  isRandomToken,
  type HubSsoConfig,
  type HubSsoStore,
  type JwtVerifier,
  type ProviderMetadata,
} from "./core.ts";

export type HandlerDeps = {
  config: HubSsoConfig;
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  discovery: () => Promise<ProviderMetadata>;
  verify: JwtVerifier;
  store: HubSsoStore;
  log?: (message: string, extra?: Record<string, unknown>) => void;
};

const ROUTES = ["status", "start", "exchange", "backchannel-logout"] as const;
type Route = (typeof ROUTES)[number];

function routeOf(url: URL): Route | null {
  const last = url.pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  return (ROUTES as readonly string[]).includes(last) ? (last as Route) : null;
}

export function createHubSsoHandler(deps: HandlerDeps): (req: Request) => Promise<Response> {
  const { config } = deps;
  const ready = config.problems.length === 0;
  const log = deps.log ?? (() => {});

  const corsHeaders = (req: Request): Record<string, string> => {
    const origin = req.headers.get("origin");
    if (!origin || origin !== config.appUrl) return { vary: "Origin" };
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
      "access-control-max-age": "600",
      vary: "Origin",
    };
  };

  const json = (req: Request | null, status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store", ...(req ? corsHeaders(req) : {}) },
    });

  const fail = (req: Request | null, err: unknown) => {
    if (err instanceof HubSsoError) return json(req, err.status, { error: err.code, message: err.message });
    log("hub-sso: unexpected error", { error: String(err) });
    return json(req, 500, { error: "server_error", message: "Erro inesperado no login pelo Hub. Tente de novo." });
  };

  const readJson = async (req: Request): Promise<Record<string, unknown>> => {
    try {
      const body = await req.json();
      return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  };

  /** Browser calls must come from the SPA itself. */
  const checkOrigin = (req: Request) => {
    const origin = req.headers.get("origin");
    if (origin && origin !== config.appUrl) throw new HubSsoError("forbidden_origin", 403, "Origem não permitida.");
  };

  const requireEnabled = () => {
    if (!ready) throw new HubSsoError("not_configured", 503, "O login pelo Hub não está configurado neste sistema.");
    if (!config.enabled) throw new HubSsoError("disabled", 503, "O login pelo Hub está desligado neste sistema.");
  };

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const route = routeOf(url);
    if (!route) return json(null, 404, { error: "not_found" });

    if (req.method === "OPTIONS") {
      return new Response(null, { status: route === "backchannel-logout" ? 405 : 204, headers: corsHeaders(req) });
    }

    try {
      if (route === "status") {
        if (req.method !== "GET") return json(req, 405, { error: "method_not_allowed" });
        return json(req, 200, { enabled: ready && config.enabled, roles: config.allowedRoles });
      }

      if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" });

      if (route === "start") {
        checkOrigin(req);
        requireEnabled();
        const body = await readJson(req);
        if (!isCodeChallenge(body.code_challenge) || !isRandomToken(body.state) || !isRandomToken(body.nonce)) {
          throw new HubSsoError("invalid_request", 400, "Pedido de login inválido.");
        }
        const meta = await deps.discovery();
        const authorizationUrl = buildAuthorizationUrl(meta, config, {
          codeChallenge: body.code_challenge,
          state: body.state,
          nonce: body.nonce,
        });
        return json(req, 200, { authorization_url: authorizationUrl });
      }

      if (route === "exchange") {
        checkOrigin(req);
        requireEnabled();
        const body = await readJson(req);
        if (!isAuthorizationCode(body.code) || !isCodeVerifier(body.code_verifier) || !isRandomToken(body.nonce)) {
          throw new HubSsoError("invalid_request", 400, "Pedido de login inválido.");
        }
        const result = await completeLogin(deps, {
          code: body.code,
          codeVerifier: body.code_verifier,
          nonce: body.nonce,
        });
        log("hub-sso: login", { user: result.user.id });
        return json(req, 200, { session: result.session, end_session_url: result.endSessionUrl, user: result.user });
      }

      // backchannel-logout: server to server, form-encoded (OIDC Back-Channel Logout 1.0 §2.5).
      // Logging out is always safe, so it works even with HUB_SSO_ENABLED=false.
      if (!ready) throw new HubSsoError("not_configured", 503, "not configured");
      const form = await req.formData().catch(() => null);
      const token = form?.get("logout_token");
      const revoked = await backchannelLogout(deps, typeof token === "string" ? token : "");
      log("hub-sso: back-channel logout", { revoked });
      return new Response(null, { status: 200, headers: { "cache-control": "no-store" } });
    } catch (err) {
      return fail(route === "backchannel-logout" ? null : req, err);
    }
  };
}
