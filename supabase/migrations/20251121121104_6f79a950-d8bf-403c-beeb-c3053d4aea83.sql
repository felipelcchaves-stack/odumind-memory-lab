-- Add demographic fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pais TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT,
ADD COLUMN IF NOT EXISTS data_nascimento DATE,
ADD COLUMN IF NOT EXISTS sexo TEXT CHECK (sexo IN ('masculino', 'feminino', 'outro', 'prefiro_nao_informar')),
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_pais ON profiles(pais);
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON profiles(estado);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Create analytics view for user demographics
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

-- Grant access to the view
GRANT SELECT ON user_demographics_summary TO authenticated;