-- Create function to get user emails (accessible only by admins)
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id as user_id, email
  FROM auth.users
  WHERE id = ANY(user_ids);
$$;