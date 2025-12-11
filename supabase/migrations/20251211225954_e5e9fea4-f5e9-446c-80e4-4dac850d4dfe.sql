-- Insert free_plan_enabled setting
INSERT INTO app_settings (key, value, category, description, is_public)
VALUES (
  'free_plan_enabled', 
  'true', 
  'features', 
  'Habilita ou desabilita o plano gratuito (7 dias de teste) para novos usuários. Quando desabilitado, novos usuários precisam assinar um plano pago.',
  true
)
ON CONFLICT (key) DO NOTHING;