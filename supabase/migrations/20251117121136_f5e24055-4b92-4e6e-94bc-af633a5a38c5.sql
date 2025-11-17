-- Permitir admins visualizarem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_admin_role(auth.uid()));

-- Permitir admins editarem todos os perfis
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_admin_role(auth.uid()));