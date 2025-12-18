-- Insert promo_guru_product_id setting
INSERT INTO public.app_settings (key, value, category, description)
VALUES ('promo_guru_product_id', '', 'promo', 'ID ou nome do produto/oferta na GURU para identificar a promoção')
ON CONFLICT (key) DO NOTHING;