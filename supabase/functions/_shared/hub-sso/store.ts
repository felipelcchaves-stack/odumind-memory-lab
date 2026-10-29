/**
 * Supabase side of the hub login: user lookup, session minting and the sid <-> session link.
 * All database access goes through SECURITY DEFINER functions from the hub_sso migration, which
 * only service_role may execute.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { HubSsoError, randomPassword, type FindUserResult, type HubSsoStore, type MintedSession } from "./core.ts";

const sessionError = () => new HubSsoError("session_error", 500, "Não foi possível abrir a sessão. Tente de novo.");

export function createSupabaseStore(opts: {
  /** service_role client (never exposed to the browser). */
  admin: SupabaseClient;
  /** Fresh client per login, without storage, used only to redeem the one-time token. */
  newClient: () => SupabaseClient;
}): HubSsoStore {
  const { admin } = opts;

  return {
    async findUser(email, roles): Promise<FindUserResult> {
      const { data, error } = await admin.rpc("hub_sso_find_user", { _email: email, _roles: roles });
      if (error) throw new HubSsoError("lookup_error", 500, "Não foi possível conferir o seu usuário. Tente de novo.");
      const row = (Array.isArray(data) ? data[0] : data) as { status?: string; user_id?: string } | null;
      if (row?.status === "ok" && typeof row.user_id === "string") return { status: "ok", userId: row.user_id };
      if (row?.status === "no_role" || row?.status === "banned" || row?.status === "unconfirmed") return { status: row.status };
      return { status: "no_user" };
    },

    async mintSession(email, userId): Promise<MintedSession> {
      // Admin generate_link never sends an e-mail; the hashed token is redeemed right here, server-side.
      // findUser ran first: a magic link for an unknown e-mail would create a user, which we never want.
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      const hashed = data?.properties?.hashed_token;
      if (error || !hashed || data.user?.id !== userId) throw sessionError();

      const { data: verified, error: verifyError } = await opts
        .newClient()
        .auth.verifyOtp({ token_hash: hashed, type: "magiclink" });
      const session = verified?.session;
      if (verifyError || !session?.access_token || !session.refresh_token || verified.user?.id !== userId) {
        throw sessionError();
      }
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
      };
    },

    async recordSession(row) {
      const { error } = await admin.rpc("hub_sso_record_session", {
        _auth_session_id: row.authSessionId,
        _user_id: row.userId,
        _hub_sid: row.hubSid,
        _hub_sub: row.hubSub,
        _hub_email: row.hubEmail,
      });
      if (error) throw sessionError();
    },

    async lockPassword(userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password: randomPassword() });
      if (error) throw new HubSsoError("lock_error", 500, "Não foi possível concluir o login. Tente de novo.");
    },

    async endLocalSessions(userId) {
      const { data, error } = await admin.rpc("hub_sso_end_local_sessions", { _user_id: userId });
      if (error) throw new HubSsoError("lock_error", 500, "Não foi possível concluir o login. Tente de novo.");
      return typeof data === "number" ? data : 0;
    },

    async revoke(target) {
      const { data, error } = await admin.rpc("hub_sso_revoke", { _sid: target.sid, _sub: target.sub });
      if (error) throw new HubSsoError("revoke_error", 500, "revoke failed");
      return typeof data === "number" ? data : 0;
    },
  };
}
