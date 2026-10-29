/**
 * Hub single sign-on guard for Edge Functions that decide admin rights with the SERVICE ROLE
 * (reading user_roles / calling has_admin_role / is_admin with the service key). Those reads see
 * no JWT, so the hub checks inside the role functions never run for them: a token from a hub
 * session that was signed out, or (with the Custom Access Token Hook on) an admin session that did
 * not come from the hub, would still pass. This asks the database the same question the RLS role
 * checks ask, AS THE CALLER: POST /rest/v1/rpc/hub_sso_current_session_revoked with the caller's
 * own Authorization header (PostgREST verifies that JWT). Same file in Gba-Orun, Isesemind and
 * Academy. Fails closed: no token, an HTTP error or anything but `false` counts as blocked.
 */

export const HUB_SESSION_BLOCKED_MESSAGE = "Sessão de administrador encerrada ou aberta sem o Hub. Entre pelo Hub.";

export interface HubSessionCheck {
  supabaseUrl: string;
  /** The project's anon (publishable) key: the request must run as the caller, not as service_role. */
  apiKey: string;
  /** The caller's Authorization header, "Bearer <access token>". */
  authorization: string | null | undefined;
  fetchFn?: typeof fetch;
}

/** True when the caller's session must not use admin rights. */
export async function hubSessionBlocked(check: HubSessionCheck): Promise<boolean> {
  const authorization = (check.authorization ?? "").trim();
  if (!/^Bearer\s+\S+$/i.test(authorization) || !check.supabaseUrl || !check.apiKey) return true;
  try {
    const res = await (check.fetchFn ?? fetch)(
      `${check.supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/hub_sso_current_session_revoked`,
      {
        method: "POST",
        headers: {
          apikey: check.apiKey,
          Authorization: authorization,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: "{}",
      },
    );
    if (!res.ok) return true;
    return (await res.json()) !== false;
  } catch {
    return true;
  }
}

/** Same, with SUPABASE_URL and SUPABASE_ANON_KEY from the function's environment. */
export function hubSessionBlockedFromEnv(
  get: (name: string) => string | undefined,
  authorization: string | null | undefined,
  fetchFn?: typeof fetch,
): Promise<boolean> {
  return hubSessionBlocked({
    supabaseUrl: get("SUPABASE_URL") ?? "",
    apiKey: get("SUPABASE_ANON_KEY") ?? "",
    authorization,
    fetchFn,
  });
}
