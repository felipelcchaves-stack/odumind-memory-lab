-- Tabela para armazenar coordenadas de cliques na landing page
CREATE TABLE public.click_coordinates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  x_percent numeric NOT NULL,
  y_percent numeric NOT NULL,
  viewport_width integer NOT NULL,
  viewport_height integer NOT NULL,
  page_url text NOT NULL,
  element_tag text,
  element_id text,
  element_class text,
  element_text text,
  ab_variant text,
  device_type text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_click_coordinates_session ON public.click_coordinates(session_id);
CREATE INDEX idx_click_coordinates_created ON public.click_coordinates(created_at);
CREATE INDEX idx_click_coordinates_variant ON public.click_coordinates(ab_variant);
CREATE INDEX idx_click_coordinates_page ON public.click_coordinates(page_url);

-- RLS
ALTER TABLE public.click_coordinates ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode inserir (visitantes anônimos)
CREATE POLICY "Anyone can insert click coordinates"
ON public.click_coordinates
FOR INSERT
WITH CHECK (true);

-- Apenas admins podem visualizar
CREATE POLICY "Admins can view click coordinates"
ON public.click_coordinates
FOR SELECT
USING (has_admin_role(auth.uid()));

-- Admins podem deletar dados antigos
CREATE POLICY "Admins can delete click coordinates"
ON public.click_coordinates
FOR DELETE
USING (has_admin_role(auth.uid()));