-- Insert GURU checkout link settings
INSERT INTO public.app_settings (key, value, category, description, is_public, is_sensitive)
VALUES 
  ('guru_checkout_akapo_monthly', '', 'guru', 'Link de checkout GURU para plano Akapo Mensal', true, false),
  ('guru_checkout_akapo_annual', '', 'guru', 'Link de checkout GURU para plano Akapo Anual', true, false),
  ('guru_checkout_awo_monthly', '', 'guru', 'Link de checkout GURU para plano Awo Mensal', true, false),
  ('guru_checkout_awo_annual', '', 'guru', 'Link de checkout GURU para plano Awo Anual', true, false),
  ('guru_checkout_egbe_monthly', '', 'guru', 'Link de checkout GURU para plano Egbe Mensal', true, false),
  ('guru_member_area_url', '', 'guru', 'Link da área do membro GURU para gestão de assinatura', true, false),
  ('guru_enabled', 'true', 'guru', 'Habilitar checkout via GURU (se false, usa Stripe)', true, false)
ON CONFLICT (key) DO NOTHING;