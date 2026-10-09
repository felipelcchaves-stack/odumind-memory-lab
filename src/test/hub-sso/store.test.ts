// @vitest-environment node
/**
 * Supabase store of the hub-sso function: user mapping, session minting, sid link and revocation.
 * First with a hand-made mock client, then with the real supabase-js client over a fake fetch to
 * pin down the exact HTTP calls (no real Supabase project is ever contacted).
 */
import { describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HubSsoError } from "../../../supabase/functions/_shared/hub-sso/core.ts";
import { createSupabaseStore } from "../../../supabase/functions/_shared/hub-sso/store.ts";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";

function mockClients(opts: {
  rpc?: (fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown };
  generateLink?: () => { data: unknown; error: unknown };
  verifyOtp?: () => { data: unknown; error: unknown };
  updateUserById?: () => { data: unknown; error: unknown };
}) {
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => opts.rpc?.(fn, args) ?? { data: null, error: null });
  const generateLink = vi.fn(async () => opts.generateLink?.() ?? { data: null, error: { message: "x" } });
  const verifyOtp = vi.fn(async () => opts.verifyOtp?.() ?? { data: null, error: { message: "x" } });
  const updateUserById = vi.fn(async (_id: string, _attrs: Record<string, unknown>) => opts.updateUserById?.() ?? { data: {}, error: null });
  const admin = { rpc, auth: { admin: { generateLink, updateUserById } } } as unknown as SupabaseClient;
  const fresh = { auth: { verifyOtp } } as unknown as SupabaseClient;
  return { admin, fresh, rpc, generateLink, verifyOtp, updateUserById };
}

describe("findUser", () => {
  it.each([
    [[{ status: "ok", user_id: ADMIN_ID }], { status: "ok", userId: ADMIN_ID }],
    [[{ status: "no_role", user_id: ADMIN_ID }], { status: "no_role" }],
    [[{ status: "banned", user_id: ADMIN_ID }], { status: "banned" }],
    [[{ status: "unconfirmed", user_id: null }], { status: "unconfirmed" }],
    [[{ status: "no_user", user_id: null }], { status: "no_user" }],
    [[], { status: "no_user" }],
  ])("maps %j", async (rows, expected) => {
    const m = mockClients({ rpc: () => ({ data: rows, error: null }) });
    const store = createSupabaseStore({ admin: m.admin, newClient: () => m.fresh });
    expect(await store.findUser("joana@ifatokun.com.br", ["admin"])).toEqual(expected);
    expect(m.rpc).toHaveBeenCalledWith("hub_sso_find_user", { _email: "joana@ifatokun.com.br", _roles: ["admin"] });
  });

  it("fails closed on a database error", async () => {
    const m = mockClients({ rpc: () => ({ data: null, error: { message: "boom" } }) });
    const store = createSupabaseStore({ admin: m.admin, newClient: () => m.fresh });
    await expect(store.findUser("a@b.c", ["admin"])).rejects.toBeInstanceOf(HubSsoError);
  });
});

describe("mintSession", () => {
  const session = { access_token: "at", refresh_token: "rt", expires_in: 3600, expires_at: 1, token_type: "bearer" };

  it("redeems an admin magic-link token server-side", async () => {
    const m = mockClients({
      generateLink: () => ({ data: { properties: { hashed_token: "hash" }, user: { id: ADMIN_ID } }, error: null }),
      verifyOtp: () => ({ data: { session, user: { id: ADMIN_ID } }, error: null }),
    });
    const store = createSupabaseStore({ admin: m.admin, newClient: () => m.fresh });
    expect(await store.mintSession("joana@ifatokun.com.br", ADMIN_ID)).toEqual(session);
    expect(m.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "joana@ifatokun.com.br" });
    expect(m.verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type: "magiclink" });
  });

  it("refuses when the link belongs to another user id (never signs in someone else)", async () => {
    const m = mockClients({
      generateLink: () => ({ data: { properties: { hashed_token: "hash" }, user: { id: "other" } }, error: null }),
      verifyOtp: () => ({ data: { session, user: { id: "other" } }, error: null }),
    });
    const store = createSupabaseStore({ admin: m.admin, newClient: () => m.fresh });
    await expect(store.mintSession("joana@ifatokun.com.br", ADMIN_ID)).rejects.toBeInstanceOf(HubSsoError);
    expect(m.verifyOtp).not.toHaveBeenCalled();
  });

  it("fails closed when generate_link or verify fail", async () => {
    let m = mockClients({ generateLink: () => ({ data: { properties: null, user: null }, error: { message: "x" } }) });
    await expect(createSupabaseStore({ admin: m.admin, newClient: () => m.fresh }).mintSession("a@b.c", ADMIN_ID)).rejects.toThrow();
    m = mockClients({
      generateLink: () => ({ data: { properties: { hashed_token: "hash" }, user: { id: ADMIN_ID } }, error: null }),
      verifyOtp: () => ({ data: { session: null, user: null }, error: { message: "expired" } }),
    });
    await expect(createSupabaseStore({ admin: m.admin, newClient: () => m.fresh }).mintSession("a@b.c", ADMIN_ID)).rejects.toThrow();
  });
});

describe("lockPassword", () => {
  it("sets a long random password (different every time) and fails closed", async () => {
    const m = mockClients({});
    const store = createSupabaseStore({ admin: m.admin, newClient: () => m.fresh });
    await store.lockPassword(ADMIN_ID);
    await store.lockPassword(ADMIN_ID);
    const [first, second] = m.updateUserById.mock.calls.map((c) => (c[1] as { password: string }).password);
    expect(m.updateUserById.mock.calls[0][0]).toBe(ADMIN_ID);
    expect(first.length).toBeGreaterThanOrEqual(64);
    expect(first).not.toBe(second);
    const failing = mockClients({ updateUserById: () => ({ data: null, error: { message: "x" } }) });
    await expect(createSupabaseStore({ admin: failing.admin, newClient: () => failing.fresh }).lockPassword(ADMIN_ID)).rejects.toThrow();
  });
});

describe("recordSession / revoke", () => {
  it("call the service-role functions with the right arguments", async () => {
    const m = mockClients({ rpc: (fn) => ({ data: fn === "hub_sso_revoke" ? 2 : null, error: null }) });
    const store = createSupabaseStore({ admin: m.admin, newClient: () => m.fresh });
    await store.recordSession({ authSessionId: "s", userId: ADMIN_ID, hubSid: "sid", hubSub: "7", hubEmail: "j@ifatokun.com.br" });
    expect(m.rpc).toHaveBeenCalledWith("hub_sso_record_session", {
      _auth_session_id: "s",
      _user_id: ADMIN_ID,
      _hub_sid: "sid",
      _hub_sub: "7",
      _hub_email: "j@ifatokun.com.br",
    });
    expect(await store.revoke({ sid: "sid", sub: "7" })).toBe(2);
    expect(m.rpc).toHaveBeenCalledWith("hub_sso_revoke", { _sid: "sid", _sub: "7" });
  });

  it("a failed record is an error (no session without a back-channel link)", async () => {
    const m = mockClients({ rpc: () => ({ data: null, error: { message: "x" } }) });
    const store = createSupabaseStore({ admin: m.admin, newClient: () => m.fresh });
    await expect(store.recordSession({ authSessionId: "s", userId: "u", hubSid: "a", hubSub: "b", hubEmail: "c" })).rejects.toThrow();
  });
});

describe("with the real supabase-js client (fake fetch)", () => {
  it("sends the expected Auth and PostgREST requests", async () => {
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null, auth: headers.get("authorization") });
      const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
      if (url.endsWith("/rest/v1/rpc/hub_sso_find_user")) return ok([{ status: "ok", user_id: ADMIN_ID }]);
      if (url.endsWith("/auth/v1/admin/generate_link")) {
        return ok({ id: ADMIN_ID, email: "joana@ifatokun.com.br", hashed_token: "hash123", action_link: "x", email_otp: "1", redirect_to: "", verification_type: "magiclink" });
      }
      if (url.endsWith("/auth/v1/verify")) {
        return ok({ access_token: "at", refresh_token: "rt", expires_in: 3600, expires_at: 9999999999, token_type: "bearer", user: { id: ADMIN_ID } });
      }
      return new Response("{}", { status: 404 });
    };
    const make = () =>
      createClient("https://project.supabase.test", "service-role-key", {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: fakeFetch as typeof fetch },
      });
    const store = createSupabaseStore({ admin: make(), newClient: make });

    expect(await store.findUser("joana@ifatokun.com.br", ["admin"])).toEqual({ status: "ok", userId: ADMIN_ID });
    const minted = await store.mintSession("joana@ifatokun.com.br", ADMIN_ID);
    expect(minted.refresh_token).toBe("rt");

    expect(calls.map((c) => new URL(c.url).pathname)).toEqual([
      "/rest/v1/rpc/hub_sso_find_user",
      "/auth/v1/admin/generate_link",
      "/auth/v1/verify",
    ]);
    expect(calls[1].body).toMatchObject({ type: "magiclink", email: "joana@ifatokun.com.br" });
    expect(calls[2].body).toMatchObject({ token_hash: "hash123", type: "magiclink" });
    // Nothing that creates or edits users is ever called.
    expect(calls.some((c) => /admin\/users|signup|invite/.test(c.url))).toBe(false);
  });
});
