-- Hub single sign-on ("Login único") for the admin area. See deploy/HUB-SSO.md.
--
-- Links every Supabase Auth session opened through the hub to the hub session (sid), so the hub's
-- back-channel logout can revoke it. Only the hub-sso Edge Function (service_role) writes here;
-- the browser only reads the status of its own session through hub_sso_session_status().

CREATE TABLE public.hub_sso_sessions (
  auth_session_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hub_sid TEXT NOT NULL,
  hub_sub TEXT NOT NULL,
  hub_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX hub_sso_sessions_hub_sid_idx ON public.hub_sso_sessions (hub_sid);
CREATE INDEX hub_sso_sessions_hub_sub_idx ON public.hub_sso_sessions (hub_sub);
CREATE INDEX hub_sso_sessions_user_id_idx ON public.hub_sso_sessions (user_id);

-- RLS on and no policies: anon/authenticated can never touch the rows directly.
ALTER TABLE public.hub_sso_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hub_sso_sessions FROM anon, authenticated;

-- PROJECT-SPECIFIC: the roles of a user, as the names used in the HUB_SSO_ALLOWED_ROLES secret.
-- Isesemind: rows of public.user_roles ('admin', 'colaborador', 'aluno', 'user').
CREATE OR REPLACE FUNCTION public.hub_sso_user_roles(_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT ur.role::text), ARRAY[]::text[])
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
$$;

-- Finds an EXISTING user with a CONFIRMED e-mail and checks the allowed roles. Never creates or
-- changes anything.
CREATE OR REPLACE FUNCTION public.hub_sso_find_user(_email TEXT, _roles TEXT[])
RETURNS TABLE (status TEXT, user_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid UUID;
  _banned_until TIMESTAMPTZ;
  _confirmed_at TIMESTAMPTZ;
BEGIN
  SELECT u.id, u.banned_until, u.email_confirmed_at INTO _uid, _banned_until, _confirmed_at
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(_email))
    AND u.deleted_at IS NULL
  LIMIT 1;

  IF _uid IS NULL THEN
    RETURN QUERY SELECT 'no_user'::text, NULL::uuid;
  ELSIF _confirmed_at IS NULL THEN
    -- Someone could have signed up with an unconfirmed address: never map the hub identity to it.
    RETURN QUERY SELECT 'unconfirmed'::text, NULL::uuid;
  ELSIF _banned_until IS NOT NULL AND _banned_until > now() THEN
    RETURN QUERY SELECT 'banned'::text, _uid;
  ELSIF NOT (public.hub_sso_user_roles(_uid) && COALESCE(_roles, ARRAY[]::text[])) THEN
    RETURN QUERY SELECT 'no_role'::text, _uid;
  ELSE
    RETURN QUERY SELECT 'ok'::text, _uid;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.hub_sso_record_session(
  _auth_session_id UUID,
  _user_id UUID,
  _hub_sid TEXT,
  _hub_sub TEXT,
  _hub_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.hub_sso_sessions (auth_session_id, user_id, hub_sid, hub_sub, hub_email)
  VALUES (_auth_session_id, _user_id, _hub_sid, _hub_sub, lower(_hub_email));

  -- Housekeeping. Revoked links are kept 8 days (longer than any access token can live) because
  -- the role checks consult them; links whose Supabase session ended normally go after a day.
  DELETE FROM public.hub_sso_sessions s
  WHERE (s.revoked_at IS NOT NULL AND s.revoked_at < now() - interval '8 days')
     OR (s.revoked_at IS NULL
         AND s.created_at < now() - interval '1 day'
         AND NOT EXISTS (SELECT 1 FROM auth.sessions a WHERE a.id = s.auth_session_id));
END
$$;

-- Back-channel logout: marks the links revoked and deletes the Supabase sessions (their refresh
-- tokens go with them, ON DELETE CASCADE). With _sid and _sub both given, both must match.
CREATE OR REPLACE FUNCTION public.hub_sso_revoke(_sid TEXT, _sub TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ids UUID[];
BEGIN
  IF _sid IS NULL AND _sub IS NULL THEN
    RETURN 0;
  END IF;

  WITH revoked AS (
    UPDATE public.hub_sso_sessions s
    SET revoked_at = COALESCE(s.revoked_at, now())
    WHERE (_sid IS NULL OR s.hub_sid = _sid)
      AND (_sub IS NULL OR s.hub_sub = _sub)
    RETURNING s.auth_session_id
  )
  SELECT array_agg(auth_session_id) INTO _ids FROM revoked;

  IF _ids IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM auth.sessions WHERE id = ANY (_ids);
  RETURN cardinality(_ids);
END
$$;

-- For the browser: is the CURRENT session a hub session ('active'), a hub session that was signed
-- out ('revoked') or a normal one ('none')? Plus the caller's own roles.
CREATE OR REPLACE FUNCTION public.hub_sso_session_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cur AS (
    SELECT NULLIF(auth.jwt() ->> 'session_id', '')::uuid AS sid, auth.uid() AS uid
  )
  SELECT jsonb_build_object(
    'status',
    CASE
      WHEN s.auth_session_id IS NULL THEN 'none'
      WHEN s.revoked_at IS NOT NULL
        OR NOT EXISTS (SELECT 1 FROM auth.sessions a WHERE a.id = s.auth_session_id) THEN 'revoked'
      ELSE 'active'
    END,
    'roles',
    to_jsonb(CASE WHEN cur.uid IS NULL THEN ARRAY[]::text[] ELSE public.hub_sso_user_roles(cur.uid) END)
  )
  FROM cur
  LEFT JOIN public.hub_sso_sessions s ON s.auth_session_id = cur.sid AND s.user_id = cur.uid
$$;

-- True when the request's access token belongs to a hub session that was signed out. Used by the
-- role checks (next migration) so a revoked admin token stops working at once, not at its expiry.
CREATE OR REPLACE FUNCTION public.hub_sso_current_session_revoked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hub_sso_sessions s
    WHERE s.auth_session_id = NULLIF(auth.jwt() ->> 'session_id', '')::uuid
      AND s.revoked_at IS NOT NULL
  )
$$;

REVOKE ALL ON FUNCTION public.hub_sso_user_roles(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hub_sso_find_user(TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hub_sso_record_session(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hub_sso_revoke(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hub_sso_session_status() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.hub_sso_find_user(TEXT, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.hub_sso_record_session(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.hub_sso_revoke(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.hub_sso_session_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hub_sso_current_session_revoked() TO anon, authenticated, service_role;
