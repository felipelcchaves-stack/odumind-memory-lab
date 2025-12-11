-- Adicionar campos para scripts customizados
INSERT INTO app_settings (key, value, category, description, is_public, is_sensitive)
VALUES 
  ('custom_head_scripts', '', 'tracking', 'Scripts JavaScript customizados para <head>', true, false),
  ('custom_body_scripts', '', 'tracking', 'Scripts JavaScript customizados para <body>', true, false)
ON CONFLICT (key) DO NOTHING;