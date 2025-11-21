-- Drop and recreate user_demographics_summary view WITHOUT security definer
DROP VIEW IF EXISTS public.user_demographics_summary;

-- Recreate the view with proper security (no SECURITY DEFINER)
-- This view now respects the querying user's RLS policies
CREATE VIEW public.user_demographics_summary AS
SELECT 
  p.pais,
  p.estado,
  p.sexo,
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) < 18 THEN 'menor_18'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 18 AND 24 THEN '18_24'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 25 AND 34 THEN '25_34'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 35 AND 44 THEN '35_44'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) BETWEEN 45 AND 54 THEN '45_54'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.data_nascimento)) >= 55 THEN 'maior_55'
    ELSE 'indefinido'
  END AS faixa_etaria,
  COUNT(*) AS total_usuarios
FROM public.profiles p
WHERE p.profile_completed = true
GROUP BY p.pais, p.estado, p.sexo, faixa_etaria;

-- Add RLS policy for the view (only admins can query it)
ALTER VIEW public.user_demographics_summary SET (security_invoker = true);

-- Grant access only to authenticated users
GRANT SELECT ON public.user_demographics_summary TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.user_demographics_summary IS 
'Demographic summary view. Uses security_invoker to respect querying user permissions. Only accessible via has_admin_role() RLS policies on underlying profiles table.';