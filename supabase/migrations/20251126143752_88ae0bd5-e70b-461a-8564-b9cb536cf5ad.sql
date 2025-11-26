-- Atualizar função get_user_emails para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Só retorna dados se o usuário autenticado for admin
  SELECT id as user_id, email
  FROM auth.users
  WHERE id = ANY(user_ids)
    AND has_admin_role(auth.uid());
$$;