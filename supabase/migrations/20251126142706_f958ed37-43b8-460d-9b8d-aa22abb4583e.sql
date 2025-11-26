-- Views não suportam RLS diretamente no PostgreSQL
-- Vamos criar uma função SECURITY DEFINER para acesso seguro

-- Dropar a view existente
DROP VIEW IF EXISTS public.user_demographics_summary;

-- Criar função segura que só admins podem acessar
CREATE OR REPLACE FUNCTION public.get_user_demographics_summary()
RETURNS TABLE (
  sexo text,
  faixa_etaria text,
  pais text,
  estado text,
  total_usuarios bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Verificar se o usuário é admin antes de retornar dados
  SELECT 
    p.sexo,
    CASE 
      WHEN p.data_nascimento IS NULL THEN 'Não informado'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) < 18 THEN 'Menor de 18'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) BETWEEN 18 AND 25 THEN '18-25'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) BETWEEN 26 AND 35 THEN '26-35'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) BETWEEN 36 AND 45 THEN '36-45'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) BETWEEN 46 AND 55 THEN '46-55'
      ELSE '56+'
    END as faixa_etaria,
    p.pais,
    p.estado,
    COUNT(*) as total_usuarios
  FROM public.profiles p
  WHERE has_admin_role(auth.uid()) -- Só retorna dados se for admin
  GROUP BY p.sexo, 
    CASE 
      WHEN p.data_nascimento IS NULL THEN 'Não informado'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) < 18 THEN 'Menor de 18'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) BETWEEN 18 AND 25 THEN '18-25'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) BETWEEN 26 AND 35 THEN '26-35'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) BETWEEN 36 AND 45 THEN '36-45'
      WHEN EXTRACT(YEAR FROM age(p.data_nascimento)) BETWEEN 46 AND 55 THEN '46-55'
      ELSE '56+'
    END,
    p.pais,
    p.estado;
$$;