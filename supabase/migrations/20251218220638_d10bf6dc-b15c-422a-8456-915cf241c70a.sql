-- Inserir configurações de visibilidade de planos
INSERT INTO app_settings (key, value, category, description, is_public)
VALUES 
  ('plan_awo_visible', 'true', 'plans', 'Exibir plano Awo na landing e assinatura', true),
  ('plan_egbe_visible', 'false', 'plans', 'Exibir plano Egbe na landing e assinatura', true),
  ('plan_gratuito_visible', 'false', 'plans', 'Exibir plano Gratuito na landing e assinatura', true)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  updated_at = now();