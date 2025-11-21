-- Drop the existing view
DROP VIEW IF EXISTS user_demographics_summary;

-- Recreate view without SECURITY DEFINER
CREATE OR REPLACE VIEW user_demographics_summary AS
SELECT 
  pais,
  estado,
  sexo,
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_nascimento)) < 18 THEN 'menor_18'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_nascimento)) BETWEEN 18 AND 24 THEN '18_24'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_nascimento)) BETWEEN 25 AND 34 THEN '25_34'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_nascimento)) BETWEEN 35 AND 44 THEN '35_44'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_nascimento)) BETWEEN 45 AND 54 THEN '45_54'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_nascimento)) >= 55 THEN '55_mais'
    ELSE 'nao_informado'
  END AS faixa_etaria,
  COUNT(*) as total_usuarios
FROM profiles
WHERE profile_completed = TRUE
GROUP BY pais, estado, sexo, faixa_etaria;

-- Grant access to the view for admins only
GRANT SELECT ON user_demographics_summary TO authenticated;