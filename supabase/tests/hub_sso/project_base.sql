-- Isesemind: the role objects the hub_sso migrations depend on, copied from
-- supabase/migrations/20251116214159_*.sql and 20251116232405_*.sql, plus helpers for test.sql.
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'colaborador', 'aluno');
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;
CREATE OR REPLACE FUNCTION public.has_colaborador_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'colaborador'))
$$;

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO anon, authenticated, service_role;
CREATE FUNCTION tests.make_admin(_uid UUID) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
$$;
CREATE FUNCTION tests.make_member(_uid UUID) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'aluno')
$$;
-- The admin-area checks the RLS policies use, as seen by the current request.
CREATE FUNCTION tests.admin_check() RETURNS boolean LANGUAGE sql AS $$
  SELECT public.has_admin_role(auth.uid()) AND public.has_colaborador_role(auth.uid())
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated, service_role;
