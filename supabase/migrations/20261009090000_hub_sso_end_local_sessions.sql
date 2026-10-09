-- Hub single sign-on: when an admin signs in through the hub (with HUB_SSO_LOCK_PASSWORD on), the
-- Supabase sessions that person opened WITHOUT the hub (password, reset e-mail, magic link) end.
-- The password is replaced at the same moment, so a session opened with it, before or after the
-- switch to the hub, must not keep working through its refresh token. Hub sessions (an active,
-- not revoked link in hub_sso_sessions) are kept, the one just opened included. Same file in
-- Gba-Orun, Isesemind and Academy. Security review 2026-10-09.

CREATE OR REPLACE FUNCTION public.hub_sso_end_local_sessions(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n INTEGER;
BEGIN
  IF _user_id IS NULL THEN
    RETURN 0;
  END IF;
  DELETE FROM auth.sessions a
  WHERE a.user_id = _user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.hub_sso_sessions s
      WHERE s.auth_session_id = a.id AND s.user_id = _user_id AND s.revoked_at IS NULL
    );
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END
$$;

REVOKE ALL ON FUNCTION public.hub_sso_end_local_sessions(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hub_sso_end_local_sessions(UUID) TO service_role;
