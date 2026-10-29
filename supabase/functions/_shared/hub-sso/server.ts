/** Builds the hub-sso request handler from environment variables (Supabase secrets). */
import { createClient } from "@supabase/supabase-js";
import { discoveryCache, loadConfig } from "./core.ts";
import { createHubSsoHandler } from "./handler.ts";
import { createSupabaseStore } from "./store.ts";
import { createJwtVerifier } from "./verifier.ts";

export function handlerFromEnv(get: (name: string) => string | undefined, fetchFn: typeof fetch = fetch) {
  const config = loadConfig(get);
  const discovery = discoveryCache((input, init) => fetchFn(input, init), config.issuer);
  const supabaseUrl = get("SUPABASE_URL") ?? "";
  const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) config.problems.push("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
  const client = () =>
    createClient(supabaseUrl || "http://invalid.local", serviceKey || "missing", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  return createHubSsoHandler({
    config,
    fetch: (input, init) => fetchFn(input, init),
    discovery,
    verify: createJwtVerifier(config.issuer, discovery),
    store: createSupabaseStore({ admin: client(), newClient: client }),
    log: (message, extra) => console.log(message, JSON.stringify(extra ?? {})),
  });
}
