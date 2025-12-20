-- Adicionar setting para controlar exibição da seção de técnicas na landing
INSERT INTO app_settings (key, value, category, description, is_public, is_sensitive)
VALUES (
  'show_technique_screenshots', 
  'false', 
  'landing', 
  'Exibe a seção de técnicas com carrossel de screenshots na landing page',
  true,
  false
) ON CONFLICT (key) DO NOTHING;