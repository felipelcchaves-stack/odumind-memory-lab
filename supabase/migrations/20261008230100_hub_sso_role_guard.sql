-- Hub single sign-on: a hub session that was signed out (back-channel logout) loses its roles at
-- once. Deleting the Supabase session already stops refreshes, but the access token it already
-- holds stays valid until it expires; every RLS policy that asks has_admin_role() /
-- has_colaborador_role() now says "no" for it. Sessions that did not come from the hub are not
-- affected (hub_sso_current_session_revoked() is false for them). Same signatures and bodies as
-- in 20251116214159 / 20251116232405, plus the extra condition.

CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
  AND NOT public.hub_sso_current_session_revoked()
$$;

CREATE OR REPLACE FUNCTION public.has_colaborador_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'colaborador')
  )
  AND NOT public.hub_sso_current_session_revoked()
$$;
