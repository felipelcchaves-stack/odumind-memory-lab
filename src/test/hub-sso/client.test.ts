// @vitest-environment node
/** Browser side of the hub login: entry validation, PKCE/one-time state, guard decisions. */
import { describe, expect, it } from "vitest";
import {
  beginHubLogin,
  decideAccess,
  finishHubLogin,
  PENDING_TTL_MS,
  pkceChallenge,
  readHubSsoConfig,
  resolveAdminTarget,
  validateInitiation,
} from "@/lib/hubSso";
import { challengeOf } from "./fakeHub";

const ORIGIN = "https://app.example.test";
const ISSUER = "https://hub.example.test/oidc";
const cfg = readHubSsoConfig(
  { VITE_HUB_SSO_ENABLED: "true", VITE_HUB_ISSUER: `${ISSUER}/`, VITE_SUPABASE_URL: "https://ref.supabase.co" },
  { prefix: "/admin", home: "/admin" },
);

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("config", () => {
  it("reads the Vite variables and derives the function URL", () => {
    expect(cfg).toMatchObject({ enabled: true, issuer: ISSUER, localLogin: false, functionUrl: "https://ref.supabase.co/functions/v1/hub-sso" });
    expect(readHubSsoConfig({}, { prefix: "/admin", home: "/admin" }).enabled).toBe(false);
    expect(readHubSsoConfig({ VITE_HUB_SSO_LOCAL_LOGIN: "TRUE" }, { prefix: "/admin", home: "/admin" }).localLogin).toBe(true);
  });
});

describe("target_link_uri", () => {
  it.each([
    [null, "/admin"],
    ["", "/admin"],
    [`${ORIGIN}/`, "/admin"],
    [`${ORIGIN}/admin`, "/admin"],
    [`${ORIGIN}/admin/users?x=1#top`, "/admin/users?x=1#top"],
    ["/admin/odu", "/admin/odu"],
    [`${ORIGIN}/administrator`, "/admin"],
    [`${ORIGIN}/perfil`, "/admin"],
    ["https://evil.example/admin", "/admin"],
    ["//evil.example/admin", "/admin"],
    ["javascript:alert(1)", "/admin"],
    ["http://app.example.test/admin", "/admin"],
    // Open-redirect variants (security review 2026-10-09)
    ["/\\evil.example/admin", "/admin"],
    ["\\\\evil.example/admin", "/admin"],
    ["/\t/evil.example/admin", "/admin"],
    ["/%2F%2Fevil.example/admin", "/admin"],
    ["/admin/../perfil", "/admin"],
    ["/admin/%2e%2e/perfil", "/admin"],
    ["JaVaScRiPt:alert(1)//admin", "/admin"],
    ["data:text/html,<script>alert(1)</script>", "/admin"],
    [`${ORIGIN}@evil.example/admin`, "/admin"],
    ["/admin/%2F%2Fevil.example", "/admin/%2F%2Fevil.example"],
  ])("%s -> %s", (target, expected) => {
    expect(resolveAdminTarget(target, ORIGIN, cfg)).toBe(expected);
  });
});

describe("iss", () => {
  const params = (q: Record<string, string>) => new URLSearchParams(q);
  it("accepts the configured hub (with or without trailing slash)", () => {
    expect(validateInitiation(params({ iss: ISSUER, target_link_uri: `${ORIGIN}/admin/x` }), ORIGIN, cfg)).toEqual({ ok: true, next: "/admin/x" });
    expect(validateInitiation(params({ iss: `${ISSUER}/` }), ORIGIN, cfg)).toEqual({ ok: true, next: "/admin" });
  });
  it.each([[{}], [{ iss: "https://evil.example/oidc" }], [{ iss: "https://hub.example.test" }], [{ iss: `${ISSUER}x` }]])(
    "refuses %j",
    (q) => {
      const result = validateInitiation(params(q as Record<string, string>), ORIGIN, cfg);
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/Hub/);
    },
  );
  it("refuses everything when no issuer is configured", () => {
    const none = readHubSsoConfig({ VITE_HUB_SSO_ENABLED: "true" }, { prefix: "/admin", home: "/admin" });
    expect(validateInitiation(params({ iss: "" }), ORIGIN, none).ok).toBe(false);
  });
});

describe("PKCE", () => {
  it("S256 challenge matches the RFC 7636 computation", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(await pkceChallenge(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    expect(await pkceChallenge(verifier)).toBe(challengeOf(verifier));
  });
});

describe("login round trip", () => {
  function fakeFunction(exchangeResponse?: { status: number; body: unknown }) {
    const requests: { url: string; body: Record<string, string> }[] = [];
    const fetchFn = async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      requests.push({ url, body });
      if (url.endsWith("/start")) {
        return new Response(JSON.stringify({ authorization_url: `${ISSUER}/auth?state=${body.state}` }), { status: 200 });
      }
      const r = exchangeResponse ?? {
        status: 200,
        body: { session: { access_token: "at", refresh_token: "rt", expires_in: 3600, token_type: "bearer" }, end_session_url: `${ISSUER}/session/end`, user: { id: "u1" } },
      };
      return new Response(JSON.stringify(r.body), { status: r.status });
    };
    return { requests, fetchFn };
  }

  it("start stores verifier/state/nonce, callback consumes them once", async () => {
    const storage = memoryStorage();
    const fn = fakeFunction();
    const url = await beginHubLogin(cfg, "/admin/users", { fetch: fn.fetchFn, storage, origin: ORIGIN });
    const state = new URL(url).searchParams.get("state")!;
    const start = fn.requests[0].body;
    expect(start.code_challenge).toHaveLength(43);
    expect(start.state).toBe(state);
    const pending = JSON.parse(storage.map.get("hub_sso_pending")!);
    expect(await pkceChallenge(pending.verifier)).toBe(start.code_challenge);
    expect(pending.next).toBe("/admin/users");

    const result = await finishHubLogin(cfg, `?code=abc123xyz&state=${state}`, { fetch: fn.fetchFn, storage });
    expect(result).toMatchObject({ next: "/admin/users", userId: "u1", endSessionUrl: `${ISSUER}/session/end` });
    expect(fn.requests[1].body).toEqual({ code: "abc123xyz", code_verifier: pending.verifier, nonce: pending.nonce });
    expect(storage.map.has("hub_sso_pending")).toBe(false);

    // Replaying the same callback URL does nothing.
    await expect(finishHubLogin(cfg, `?code=abc123xyz&state=${state}`, { fetch: fn.fetchFn, storage })).rejects.toThrow(/expirou|outra aba/);
    expect(fn.requests).toHaveLength(2);
  });

  it("never follows an authorization URL outside the configured hub", async () => {
    const storage = memoryStorage();
    const fetchFn = async () => new Response(JSON.stringify({ authorization_url: "https://evil.example/oidc/auth" }), { status: 200 });
    await expect(beginHubLogin(cfg, "/admin", { fetch: fetchFn, storage, origin: ORIGIN })).rejects.toThrow(/inesperado/);
    expect(storage.map.size).toBe(0);
  });

  it("refuses a state from another browser, an expired login and hub errors", async () => {
    const fn = fakeFunction();
    let storage = memoryStorage();
    await beginHubLogin(cfg, "/admin", { fetch: fn.fetchFn, storage, origin: ORIGIN });
    await expect(finishHubLogin(cfg, "?code=abc123xyz&state=forged-state-value-000000", { fetch: fn.fetchFn, storage })).rejects.toThrow(/não confere/);

    storage = memoryStorage();
    const now = Date.now();
    const url = await beginHubLogin(cfg, "/admin", { fetch: fn.fetchFn, storage, origin: ORIGIN, now: () => now });
    const state = new URL(url).searchParams.get("state");
    await expect(
      finishHubLogin(cfg, `?code=abc123xyz&state=${state}`, { fetch: fn.fetchFn, storage, now: () => now + PENDING_TTL_MS + 1 }),
    ).rejects.toThrow(/expirou/);

    storage = memoryStorage();
    await beginHubLogin(cfg, "/admin", { fetch: fn.fetchFn, storage, origin: ORIGIN });
    await expect(finishHubLogin(cfg, "?error=access_denied", { fetch: fn.fetchFn, storage })).rejects.toThrow(/não liberou/);
    expect(fn.requests.filter((r) => r.url.endsWith("/exchange"))).toHaveLength(0);
  });

  it("refuses a response that names another issuer (RFC 9207) and never echoes free text", async () => {
    const fn = fakeFunction();
    let storage = memoryStorage();
    let url = await beginHubLogin(cfg, "/admin", { fetch: fn.fetchFn, storage, origin: ORIGIN });
    let state = new URL(url).searchParams.get("state");
    await expect(
      finishHubLogin(cfg, `?code=abc123xyz&state=${state}&iss=${encodeURIComponent("https://evil.example/oidc")}`, { fetch: fn.fetchFn, storage }),
    ).rejects.toThrow(/não veio do Hub/);
    expect(fn.requests.filter((r) => r.url.endsWith("/exchange"))).toHaveLength(0);

    storage = memoryStorage();
    url = await beginHubLogin(cfg, "/admin", { fetch: fn.fetchFn, storage, origin: ORIGIN });
    state = new URL(url).searchParams.get("state");
    await expect(
      finishHubLogin(cfg, `?code=abc123xyz&state=${state}&iss=${encodeURIComponent(`${ISSUER}/`)}`, { fetch: fn.fetchFn, storage }),
    ).resolves.toMatchObject({ userId: "u1" });

    const spoof = "?error=" + encodeURIComponent("Sua conta foi bloqueada. Ligue para 0800 000 0000");
    await expect(finishHubLogin(cfg, spoof, { fetch: fn.fetchFn, storage })).rejects.toThrow(/^O Hub recusou o login\.$/);
    await expect(finishHubLogin(cfg, "?error=temporarily_unavailable", { fetch: fn.fetchFn, storage })).rejects.toThrow(
      "O Hub recusou o login (temporarily_unavailable).",
    );
    await expect(finishHubLogin(cfg, "?error=", { fetch: fn.fetchFn, storage })).rejects.toThrow(/^O Hub recusou o login\.$/);
  });

  it("shows the function's pt-BR refusal", async () => {
    const storage = memoryStorage();
    const fn = fakeFunction({ status: 403, body: { error: "unknown_user", message: "Não há usuário com o e-mail x@ifatokun.com.br neste sistema." } });
    const url = await beginHubLogin(cfg, "/admin", { fetch: fn.fetchFn, storage, origin: ORIGIN });
    const state = new URL(url).searchParams.get("state");
    await expect(finishHubLogin(cfg, `?code=abc123xyz&state=${state}`, { fetch: fn.fetchFn, storage })).rejects.toThrow(
      "Não há usuário com o e-mail x@ifatokun.com.br neste sistema.",
    );
  });
});

describe("admin guard decision", () => {
  const on = { enabled: true, localLogin: false };
  const server = { enabled: true, roles: ["admin"] };
  const admin = (status: "active" | "revoked" | "none") => ({ status, roles: ["admin"] });

  it.each([
    ["flag off", { cfg: { enabled: false, localLogin: false }, server, hasSession: false, session: "unknown" as const }, "allow"],
    ["no session", { cfg: on, server, hasSession: false, session: "unknown" as const }, "login"],
    ["hub session", { cfg: on, server, hasSession: true, session: admin("active") }, "allow"],
    ["revoked hub session", { cfg: on, server, hasSession: true, session: admin("revoked") }, "relogin"],
    ["admin with password session", { cfg: on, server, hasSession: true, session: admin("none") }, "login"],
    ["student with password session", { cfg: on, server, hasSession: true, session: { status: "none" as const, roles: ["user"] } }, "allow"],
    ["server switched off", { cfg: on, server: { enabled: false, roles: ["admin"] }, hasSession: false, session: "unknown" as const }, "allow"],
    ["server unreachable", { cfg: on, server: "unreachable" as const, hasSession: true, session: "unknown" as const }, "error"],
    ["status unknown", { cfg: on, server, hasSession: true, session: "unknown" as const }, "error"],
    ["emergency local login, no session", { cfg: { enabled: true, localLogin: true }, server, hasSession: false, session: "unknown" as const }, "allow"],
    ["emergency local login, password admin", { cfg: { enabled: true, localLogin: true }, server, hasSession: true, session: admin("none") }, "allow"],
    ["emergency local login, revoked", { cfg: { enabled: true, localLogin: true }, server, hasSession: true, session: admin("revoked") }, "relogin"],
  ])("%s", (_label, input, expected) => {
    expect(decideAccess(input)).toBe(expected);
  });
});
