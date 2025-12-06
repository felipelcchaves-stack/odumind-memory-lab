-- Adicionar configuração para habilitar/desabilitar sistema de indicações
INSERT INTO public.app_settings (key, value, category, description, is_public)
VALUES ('referral_system_enabled', 'true', 'features', 'Habilita ou desabilita o sistema de indicações para alunos', true)
ON CONFLICT (key) DO NOTHING;