// @vitest-environment node
/**
 * Edge Function guard: the admin functions that check roles with the service role ask the database,
 * as the caller, whether the session is a revoked / non-hub admin session. Fake fetch only.
 */
import { describe, expect, it, vi } from "vitest";
import {
  hubSessionBlocked,
  hubSessionBlockedFromEnv,
} from "../../../supabase/functions/_shared/hub-sso/guard.ts";

const URL_ = "https://proj.supabase.co/";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("hubSessionBlocked", () => {
  it("asks PostgREST as the caller and lets a normal session through", async () => {
    const fetchFn = vi.fn(async () => json(false));
    const blocked = await hubSessionBlocked({ supabaseUrl: URL_, apiKey: "anon", authorization: "Bearer tok", fetchFn });
    expect(blocked).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/rest/v1/rpc/hub_sso_current_session_revoked");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ apikey: "anon", Authorization: "Bearer tok" });
    expect(init.body).toBe("{}");
  });

  it("blocks a revoked or non-hub admin session", async () => {
    expect(await hubSessionBlocked({ supabaseUrl: URL_, apiKey: "anon", authorization: "Bearer t", fetchFn: async () => json(true) })).toBe(true);
  });

  it("fails closed", async () => {
    const base = { supabaseUrl: URL_, apiKey: "anon", authorization: "Bearer t" };
    expect(await hubSessionBlocked({ ...base, fetchFn: async () => json({ message: "JWT expired" }, 401) })).toBe(true);
    expect(await hubSessionBlocked({ ...base, fetchFn: async () => json({ code: "PGRST202" }, 404) })).toBe(true);
    expect(await hubSessionBlocked({ ...base, fetchFn: async () => json(null) })).toBe(true);
    expect(await hubSessionBlocked({ ...base, fetchFn: async () => new Response("not json") })).toBe(true);
    expect(await hubSessionBlocked({ ...base, fetchFn: async () => { throw new Error("network"); } })).toBe(true);
  });

  it("blocks without calling anything when the token or the config is missing", async () => {
    const fetchFn = vi.fn(async () => json(false));
    for (const authorization of [null, undefined, "", "tok", "Bearer ", "Basic abc"]) {
      expect(await hubSessionBlocked({ supabaseUrl: URL_, apiKey: "anon", authorization, fetchFn })).toBe(true);
    }
    expect(await hubSessionBlocked({ supabaseUrl: "", apiKey: "anon", authorization: "Bearer t", fetchFn })).toBe(true);
    expect(await hubSessionBlocked({ supabaseUrl: URL_, apiKey: "", authorization: "Bearer t", fetchFn })).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("reads the URL and the anon key (never the service key) from the environment", async () => {
    const fetchFn = vi.fn(async () => json(false));
    const env: Record<string, string> = { SUPABASE_URL: "https://p.supabase.co", SUPABASE_ANON_KEY: "anon-key", SUPABASE_SERVICE_ROLE_KEY: "service" };
    expect(await hubSessionBlockedFromEnv((n) => env[n], "Bearer t", fetchFn)).toBe(false);
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ apikey: "anon-key" });
    expect(await hubSessionBlockedFromEnv(() => undefined, "Bearer t", fetchFn)).toBe(true);
  });
});
