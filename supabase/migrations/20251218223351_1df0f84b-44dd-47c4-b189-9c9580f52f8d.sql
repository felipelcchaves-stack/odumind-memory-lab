-- Inserir configurações do Exit Intent Popup na tabela app_settings
INSERT INTO app_settings (key, value, category, description, is_public, is_sensitive)
VALUES 
  ('exit_popup_enabled', 'true', 'marketing', 'Habilitar Exit Intent Popup na landing page', true, false),
  ('exit_popup_discount_percent', '20', 'marketing', 'Percentual de desconto oferecido no popup', true, false),
  ('exit_popup_title', 'Espera! 🎁', 'marketing', 'Título do popup de exit intent', true, false),
  ('exit_popup_description', 'Antes de ir, que tal {discount}% de desconto no seu primeiro mês?', 'marketing', 'Descrição do popup (use {discount} para o percentual)', true, false),
  ('exit_popup_button_text', 'Quero Meu Desconto de {discount}%', 'marketing', 'Texto do botão do popup (use {discount} para o percentual)', true, false),
  ('exit_popup_delay_seconds', '3', 'marketing', 'Tempo em segundos antes de ativar o popup', true, false)
ON CONFLICT (key) DO NOTHING;