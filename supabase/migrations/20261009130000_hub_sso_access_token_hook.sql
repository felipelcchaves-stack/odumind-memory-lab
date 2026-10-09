-- Hub single sign-on: closes the "Esqueci a senha" / magic-link path to an admin session that does
-- not come from the hub. This migration only CREATES functions; nothing changes until the hook is
-- turned on in the dashboard (Authentication > Hooks > Customize Access Token (JWT) Claims >
-- Postgres > public.hub_sso_access_token_hook). Steps and rollback: deploy/HUB-SSO.md.
--
-- Supabase Auth calls the hook before it issues every access token (sign-in and refresh) with
--   {"user_id": uuid, "claims": {...}, "authentication_method": "password" | "otp" | "magiclink" |
--    "recovery" | "token_refresh" | ...}
-- and expects {"claims": {...}} (required claims kept) or {"error": {"http_code", "message"}}.
--
-- For a user with a hub-managed role (hub_sso_hook_roles(), below):
--   * session linked to an active hub session      -> token issued, claim hub_sso = "linked";
--   * session linked to a hub session that ended   -> refused (401);
--   * session NOT linked, opened by password, reset link (recovery), sign-up, invite, e-mail change,
--     anonymous sign-in, or a refresh               -> refused (403): such a session cannot start
--     and cannot be kept alive (a hub session is always linked before its first refresh);
--   * session NOT linked, any other method (the hub itself signs in with a server-side magic link,
--     indistinguishable from an e-mailed one)       -> token issued with claim hub_sso = "unlinked".
-- hub_sso_current_session_revoked() (used by every admin check in RLS, see the role guard migration)
-- now also says "revoked" for an "unlinked" token whose session is still not linked when the request
-- arrives. The hub-sso function links its session before handing it to the browser, so its token
-- works; an e-mailed magic link never gets linked, so it signs in as a plain user with no admin
-- rights, and cannot be refreshed. Users without a hub-managed role are never touched.
-- With the hook off no token carries hub_sso, so behavior is exactly as before this migration.

-- PROJECT-SPECIFIC: the roles whose sessions must come from the hub, as named by
-- hub_sso_user_roles(). Keep it equal to the HUB_SSO_ALLOWED_ROLES secret of the hub-sso function.
-- Isesemind: 'admin' (user_roles). Collaborators and students keep signing in as today.
CREATE OR REPLACE FUNCTION public.hub_sso_hook_roles()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY['admin']::text[]
$$;

CREATE OR REPLACE FUNCTION public.hub_sso_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _claims JSONB := COALESCE(event -> 'claims', '{}'::jsonb);
  _method TEXT := COALESCE(event ->> 'authentication_method', '');
  _uid UUID;
  _sid UUID;
  _managed BOOLEAN;
  _revoked_at TIMESTAMPTZ;
  _found BOOLEAN := false;
BEGIN
  BEGIN
    _uid := NULLIF(event ->> 'user_id', '')::uuid;
    _sid := NULLIF(_claims ->> 'session_id', '')::uuid;
    _managed := _uid IS NOT NULL
      AND COALESCE(public.hub_sso_user_roles(_uid) && public.hub_sso_hook_roles(), false);
    IF _managed THEN
      SELECT s.revoked_at, true INTO _revoked_at, _found
      FROM public.hub_sso_sessions s
      WHERE s.auth_session_id = _sid AND s.user_id = _uid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never lock everybody out because of a bug here: let the sign-in through, but as "unlinked"
    -- (no admin rights until the session is linked to the hub). Plain users lose nothing by it.
    RETURN jsonb_build_object('claims', _claims || '{"hub_sso": "unlinked"}'::jsonb);
  END;

  IF NOT _managed THEN
    RETURN jsonb_build_object('claims', _claims);
  END IF;
  IF _found AND _revoked_at IS NULL THEN
    RETURN jsonb_build_object('claims', _claims || '{"hub_sso": "linked"}'::jsonb);
  END IF;
  IF _found THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 401,
      'message', 'Sua sessão foi encerrada no Hub. Entre de novo pelo Hub.'));
  END IF;
  IF _method IN ('password', 'recovery', 'token_refresh', 'email/signup', 'invite', 'email_change', 'anonymous') THEN
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Quem administra entra pelo Hub (hub.ifatokun.com.br).'));
  END IF;
  RETURN jsonb_build_object('claims', _claims || '{"hub_sso": "unlinked"}'::jsonb);
END
$$;

-- Same function as in the hub_sso migration, plus the "unlinked" rule above. Every role check that
-- already calls it (has_role / has_admin_role / is_admin ...) and the Edge Function guard
-- (_shared/hub-sso/guard.ts) get the rule with no other change.
CREATE OR REPLACE FUNCTION public.hub_sso_current_session_revoked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cur AS (
    SELECT NULLIF(auth.jwt() ->> 'session_id', '')::uuid AS sid,
           auth.uid() AS uid,
           auth.jwt() ->> 'hub_sso' AS mark
  )
  SELECT EXISTS (
           SELECT 1 FROM public.hub_sso_sessions s, cur
           WHERE s.auth_session_id = cur.sid AND s.revoked_at IS NOT NULL
         )
      OR EXISTS (
           SELECT 1 FROM cur
           WHERE cur.mark = 'unlinked'
             AND NOT EXISTS (
               SELECT 1 FROM public.hub_sso_sessions s
               WHERE s.auth_session_id = cur.sid AND s.user_id = cur.uid AND s.revoked_at IS NULL
             )
         )
$$;

-- Only Supabase Auth may call the hook (docs: grant to supabase_auth_admin, revoke from the rest).
REVOKE ALL ON FUNCTION public.hub_sso_hook_roles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hub_sso_access_token_hook(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hub_sso_access_token_hook(JSONB) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hub_sso_current_session_revoked() TO anon, authenticated, service_role;
