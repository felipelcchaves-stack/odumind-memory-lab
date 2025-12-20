-- Função para inicializar role de aluno automaticamente
CREATE OR REPLACE FUNCTION public.initialize_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'aluno')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger que executa após insert em auth.users
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_role();

-- Corrigir usuários existentes sem role (atribuir 'aluno')
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'aluno'
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;