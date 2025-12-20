-- Inserir configurações de urgência (escassez)
INSERT INTO public.app_settings (key, value, category, description, is_public, is_sensitive) VALUES
  ('urgency_enabled', 'false', 'urgency', 'Habilitar seção de urgência/escassez', true, false),
  ('urgency_title', 'Últimas {spots} Vagas do Mês', 'urgency', 'Título da seção de urgência', true, false),
  ('urgency_subtitle', 'Desconto especial de lançamento termina em:', 'urgency', 'Subtítulo da seção de urgência', true, false),
  ('urgency_spots_total', '50', 'urgency', 'Total de vagas disponíveis', true, false),
  ('urgency_spots_remaining', '50', 'urgency', 'Vagas restantes', true, false),
  ('urgency_end_date', '', 'urgency', 'Data/hora de fim do timer (ISO 8601)', true, false),
  ('urgency_show_timer', 'true', 'urgency', 'Mostrar timer regressivo', true, false),
  ('urgency_show_spots', 'true', 'urgency', 'Mostrar contador de vagas', true, false),
  ('urgency_show_social_proof', 'true', 'urgency', 'Mostrar prova social (estudantes ativos, etc)', true, false)
ON CONFLICT (key) DO NOTHING;

-- Inserir configurações do banner de promoções
INSERT INTO public.app_settings (key, value, category, description, is_public, is_sensitive) VALUES
  ('promo_banner_enabled', 'false', 'promo_banner', 'Habilitar banner de promoções', true, false),
  ('promo_banner_text', '🔥 Black Friday: 50% OFF em todos os planos!', 'promo_banner', 'Texto do banner', true, false),
  ('promo_banner_link', '/auth', 'promo_banner', 'URL de destino ao clicar', true, false),
  ('promo_banner_link_text', 'Aproveitar', 'promo_banner', 'Texto do link', true, false),
  ('promo_banner_bg_color', 'primary', 'promo_banner', 'Cor de fundo (primary, secondary, destructive, ou hex)', true, false),
  ('promo_banner_text_color', 'primary-foreground', 'promo_banner', 'Cor do texto', true, false),
  ('promo_banner_start_date', '', 'promo_banner', 'Data de início (ISO 8601)', true, false),
  ('promo_banner_end_date', '', 'promo_banner', 'Data de fim (ISO 8601)', true, false),
  ('promo_banner_dismissible', 'true', 'promo_banner', 'Usuário pode fechar o banner', true, false)
ON CONFLICT (key) DO NOTHING;