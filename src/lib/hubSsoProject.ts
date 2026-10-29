/**
 * Isesemind specifics of the hub login (the rest is shared: src/lib/hubSso.ts,
 * src/components/hub-sso/*, supabase/functions/_shared/hub-sso/*). Docs: deploy/HUB-SSO.md.
 */
import { supabase } from "@/integrations/supabase/client";
import { readHubSsoConfig, type MintedSession } from "./hubSso";

export const hubSso = readHubSsoConfig(import.meta.env, { prefix: "/admin", home: "/admin" });

/** Where the old e-mail + password login lives (only offered when VITE_HUB_SSO_LOCAL_LOGIN=true). */
export const LOCAL_LOGIN_PATH = "/auth";

export { supabase };

/** Pauses useSessionValidation while the new session is being set up (same flag as signIn). */
export async function beforeHubSession(): Promise<void> {
  localStorage.setItem("login_in_progress", Date.now().toString());
}

/**
 * Same single-session rule as the password login (AuthContext.signIn): register this device in
 * enforce-single-session and keep its session_id, which useSessionValidation checks every minute.
 */
export async function afterHubSession(session: MintedSession): Promise<void> {
  try {
    const { data } = await supabase.functions.invoke("enforce-single-session", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { device_info: { userAgent: navigator.userAgent, platform: navigator.platform }, ip_address: null },
    });
    if (data?.session_id) localStorage.setItem("session_id", data.session_id);
  } finally {
    setTimeout(() => localStorage.removeItem("login_in_progress"), 3000);
  }
}
