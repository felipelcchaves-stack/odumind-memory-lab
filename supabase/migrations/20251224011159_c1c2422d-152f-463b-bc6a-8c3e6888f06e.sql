-- Inserir configurações do vídeo do Oluwo
INSERT INTO public.app_settings (key, value, category, description, is_public, is_sensitive) VALUES
  ('oluwo_video_type', 'youtube', 'landing', 'Tipo de player de vídeo: youtube, vturb, iframe, script', true, false),
  ('oluwo_video_url', 'https://www.youtube.com/embed/MKI62vSrTLQ', 'landing', 'URL do vídeo ou ID do embed', true, false),
  ('oluwo_video_script', '', 'landing', 'Código de script para players como Vturb (HTML/JS)', true, false)
ON CONFLICT (key) DO NOTHING;