/** Hub login state of the current Supabase session, and "Sair". */
import { forgetHubSession, hubSessionInfo } from "./hubSso";
import { hubSso, supabase } from "./hubSsoProject";

export type SessionStatus = { status: "active" | "revoked" | "none"; roles: string[] };

/** Status of the current Supabase session as seen by the database (hub_sso migration). */
export async function currentSessionStatus(): Promise<SessionStatus | "unknown"> {
  const { data, error } = await supabase.rpc("hub_sso_session_status");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return "unknown";
  const value = data as { status?: unknown; roles?: unknown };
  const status = value.status === "active" || value.status === "revoked" ? value.status : "none";
  const roles = Array.isArray(value.roles) ? value.roles.filter((r): r is string => typeof r === "string") : [];
  return { status, roles };
}

/**
 * "Sair" in the admin area. Signs out of Supabase with the app's own sign-out, and when the
 * session came from the hub, continues to the hub's end_session page (RP-initiated logout:
 * "Sair de todos os sistemas?"). Returns true when the browser is leaving for the hub.
 */
let signingOut = false;

/** True after "Sair" was clicked on this page: the admin guard then never starts a new login. */
export const isSigningOut = () => signingOut;

export async function signOutWithHub(localSignOut: () => Promise<unknown>): Promise<boolean> {
  signingOut = true;
  const info = hubSessionInfo();
  try {
    await localSignOut();
  } finally {
    forgetHubSession();
  }
  if (hubSso.enabled && info?.endSessionUrl) {
    window.location.assign(info.endSessionUrl);
    return true;
  }
  return false;
}
