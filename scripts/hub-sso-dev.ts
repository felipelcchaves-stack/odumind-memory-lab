/**
 * DEV ONLY — runs the real hub-sso Edge Function code under Deno next to a FAKE Supabase (Auth +
 * PostgREST, in memory), on one local port, so the whole admin login can be tried in a browser
 * against a local hub without Docker and without touching the real Supabase project.
 *
 *   HUB_ISSUER=http://localhost:3040/oidc HUB_CLIENT_ID=… HUB_CLIENT_SECRET=… \
 *   HUB_SSO_APP_URL=http://localhost:3194 DEV_PORT=3191 DEV_ADMIN_EMAIL=teste@ifatokun.com.br \
 *   deno run --allow-net --allow-env --config supabase/functions/hub-sso/deno.json scripts/hub-sso-dev.ts
 *
 * Then run the SPA with VITE_SUPABASE_URL=http://localhost:3191. GET /__state shows what happened.
 */
import { handlerFromEnv } from "../supabase/functions/_shared/hub-sso/server.ts";

const port = Number(Deno.env.get("DEV_PORT") ?? "3191");
const base = `http://localhost:${port}`;
const adminEmail = (Deno.env.get("DEV_ADMIN_EMAIL") ?? "teste@ifatokun.com.br").toLowerCase();
const adminRole = Deno.env.get("DEV_ADMIN_ROLE") ?? "admin";
const adminId = "0d000000-0000-4000-8000-000000000001";

type Session = { id: string; userId: string; refresh: string };
const state = {
  sessions: new Map<string, Session>(),
  links: [] as { authSessionId: string; hubSid: string; hubSub: string; revoked: boolean }[],
  passwordLocks: 0,
  log: [] as string[],
};
const hashed = new Map<string, string>();

const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const accessToken = (s: Session) =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
    sub: s.userId,
    session_id: s.id,
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: "otp", timestamp: Math.floor(Date.now() / 1000) }],
    aud: "authenticated",
    email: adminEmail,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })}.${b64("dev-signature-not-verified")}`;
// DEV_USER_MFA=true: the admin has a verified Supabase TOTP factor (Academy asks for it on aal1).
const mfa = Deno.env.get("DEV_USER_MFA") === "true";
const user = () => ({
  id: adminId,
  aud: "authenticated",
  role: "authenticated",
  email: adminEmail,
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
  ...(mfa ? { factors: [{ id: "f1", factor_type: "totp", status: "verified", friendly_name: "app", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] } : {}),
});
const sessionBody = (s: Session) => ({ access_token: accessToken(s), refresh_token: s.refresh, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: user() });
const claims = (req: Request): Record<string, string> | null => {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
};
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
  "access-control-expose-headers": "content-range",
};
const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors, ...extra } });

const fn = handlerFromEnv((name) => {
  if (name === "SUPABASE_URL") return base;
  if (name === "SUPABASE_SERVICE_ROLE_KEY") return "dev-service-role";
  if (name === "HUB_SSO_ENABLED") return Deno.env.get(name) ?? "true";
  return Deno.env.get(name);
});

async function fakeSupabase(req: Request, url: URL): Promise<Response> {
  const path = url.pathname;
  const body = req.method === "POST" || req.method === "PUT" ? await req.json().catch(() => ({})) : {};
  const me = claims(req);

  if (path === "/auth/v1/admin/generate_link") {
    if (String(body.email).toLowerCase() !== adminEmail) return json(422, { msg: "would create a user — refused by the fake" });
    const h = crypto.randomUUID();
    hashed.set(h, adminId);
    return json(200, { ...user(), hashed_token: h, action_link: "x", email_otp: "000000", redirect_to: "", verification_type: "magiclink" });
  }
  if (path === "/auth/v1/verify") {
    const uid = hashed.get(body.token_hash);
    hashed.delete(body.token_hash);
    if (!uid) return json(403, { code: "otp_expired", msg: "Token has expired or is invalid" });
    const s = { id: crypto.randomUUID(), userId: uid, refresh: crypto.randomUUID() };
    state.sessions.set(s.id, s);
    return json(200, sessionBody(s));
  }
  if (path.startsWith("/auth/v1/admin/users/") && req.method === "PUT") {
    if (typeof body.password === "string" && body.password.length >= 64) state.passwordLocks++;
    return json(200, user());
  }
  if (path === "/auth/v1/user") {
    return me && state.sessions.has(me.session_id) ? json(200, user()) : json(403, { code: "session_not_found", msg: "Session not found" });
  }
  if (path === "/auth/v1/token" && url.searchParams.get("grant_type") === "refresh_token") {
    const s = [...state.sessions.values()].find((x) => x.refresh === body.refresh_token);
    if (!s) return json(400, { code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
    s.refresh = crypto.randomUUID();
    return json(200, sessionBody(s));
  }
  if (path === "/auth/v1/logout") {
    if (me) state.sessions.delete(me.session_id);
    return new Response(null, { status: 204, headers: cors });
  }
  if (path.startsWith("/auth/v1/")) return json(200, {});

  if (path.startsWith("/rest/v1/rpc/")) {
    const name = path.slice("/rest/v1/rpc/".length);
    if (name === "hub_sso_find_user") {
      const ok = String(body._email).toLowerCase() === adminEmail;
      const roleOk = Array.isArray(body._roles) && body._roles.includes(adminRole);
      return json(200, [{ status: ok ? (roleOk ? "ok" : "no_role") : "no_user", user_id: ok ? adminId : null }]);
    }
    if (name === "hub_sso_record_session") {
      state.links.push({ authSessionId: body._auth_session_id, hubSid: body._hub_sid, hubSub: body._hub_sub, revoked: false });
      return json(200, null);
    }
    if (name === "hub_sso_revoke") {
      let n = 0;
      for (const l of state.links) {
        if ((body._sid === null || l.hubSid === body._sid) && (body._sub === null || l.hubSub === body._sub)) {
          l.revoked = true;
          state.sessions.delete(l.authSessionId);
          n++;
        }
      }
      state.log.push(`revoke sid=${body._sid} sub=${body._sub} -> ${n}`);
      return json(200, n);
    }
    if (name === "hub_sso_session_status") {
      const link = state.links.find((l) => l.authSessionId === me?.session_id);
      const status = !link ? "none" : link.revoked || !state.sessions.has(link.authSessionId) ? "revoked" : "active";
      return json(200, { status, roles: me?.sub === adminId ? [adminRole] : [] });
    }
    if (/^(has_|is_)/.test(name)) return json(200, me?.sub === adminId);
    return json(200, null);
  }
  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length);
    const uid = me?.sub ?? null;
    let rows: unknown[] = [];
    if (table === "profiles") rows = uid ? [{ id: uid, user_id: uid, email: adminEmail, onboarding_completed: true, display_name: "Teste Hub", full_name: "Teste Hub", nome: "Teste Hub", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), profile_completed: true, pais: "Brasil", estado: "SP", data_nascimento: "1990-01-01", sexo: "f" }] : [];
    if (table === "user_roles") rows = uid === adminId ? [{ user_id: uid, role: adminRole }] : [];
    const single = (req.headers.get("accept") ?? "").includes("vnd.pgrst.object");
    if (single) return rows.length ? json(200, rows[0]) : json(406, { code: "PGRST116", message: "no rows" });
    return json(200, req.method === "GET" || req.method === "HEAD" ? rows : [], { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }
  if (path.startsWith("/realtime/") || path.startsWith("/storage/")) return json(404, {});
  return json(404, { error: "fake supabase: unknown route" });
}

Deno.serve({ port, hostname: "127.0.0.1" }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/__state") {
    return json(200, { sessions: [...state.sessions.keys()], links: state.links, passwordLocks: state.passwordLocks, log: state.log });
  }
  if (url.pathname.startsWith("/functions/v1/hub-sso")) {
    state.log.push(`${req.method} ${url.pathname}`);
    return fn(req);
  }
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  // Project functions the admin area calls on its own (Isesemind single-session rule).
  if (url.pathname === "/functions/v1/enforce-single-session") return json(200, { session_id: crypto.randomUUID() });
  if (url.pathname === "/functions/v1/validate-session") return json(200, { valid: true });
  if (url.pathname.startsWith("/functions/v1/")) return json(200, {});
  return fakeSupabase(req, url);
});
