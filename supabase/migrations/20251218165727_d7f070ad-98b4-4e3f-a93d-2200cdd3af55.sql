-- Inserir configurações do plano promocional
INSERT INTO app_settings (key, value, category, description, is_public) VALUES
('promo_enabled', 'false', 'promo', 'Habilitar reconhecimento de promoção no webhook', true),
('promo_name', 'Lançamento Especial', 'promo', 'Nome da promoção exibido no email', true),
('promo_duration_days', '90', 'promo', 'Duração do acesso em dias', true),
('promo_plan_mapping', 'Awo', 'promo', 'Plano interno equivalente (Awo ou Egbe)', true),
('promo_checkout_url', '', 'promo', 'URL de checkout GURU para a promoção', true)
ON CONFLICT (key) DO NOTHING;