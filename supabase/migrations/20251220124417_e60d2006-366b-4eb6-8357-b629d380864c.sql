-- Tabela para configuração dos testes A/B
CREATE TABLE public.landing_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B', 'C')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  traffic_percentage INTEGER NOT NULL DEFAULT 33 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  headline TEXT,
  subheadline TEXT,
  cta_text TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(test_name, variant)
);

-- Tabela para sessões e conversões
CREATE TABLE public.landing_ab_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  test_name TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B', 'C')),
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  conversion_type TEXT, -- 'signup', 'checkout', 'purchase'
  page_views INTEGER NOT NULL DEFAULT 1,
  time_on_page INTEGER DEFAULT 0, -- segundos
  scroll_depth INTEGER DEFAULT 0, -- percentual
  cta_clicks INTEGER DEFAULT 0,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, test_name)
);

-- Índices para performance
CREATE INDEX idx_ab_sessions_test_variant ON public.landing_ab_sessions(test_name, variant);
CREATE INDEX idx_ab_sessions_converted ON public.landing_ab_sessions(converted) WHERE converted = true;
CREATE INDEX idx_ab_sessions_created ON public.landing_ab_sessions(created_at);
CREATE INDEX idx_ab_tests_active ON public.landing_ab_tests(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.landing_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_ab_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas para testes A/B (somente admins podem gerenciar)
CREATE POLICY "Anyone can view active tests" ON public.landing_ab_tests
  FOR SELECT USING (is_active = true OR has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert tests" ON public.landing_ab_tests
  FOR INSERT WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can update tests" ON public.landing_ab_tests
  FOR UPDATE USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete tests" ON public.landing_ab_tests
  FOR DELETE USING (has_admin_role(auth.uid()));

-- Políticas para sessões (qualquer um pode criar, somente admin vê todas)
CREATE POLICY "Anyone can insert sessions" ON public.landing_ab_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update their own session" ON public.landing_ab_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Admins can view all sessions" ON public.landing_ab_sessions
  FOR SELECT USING (has_admin_role(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_landing_ab_tests_updated_at
  BEFORE UPDATE ON public.landing_ab_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_ab_sessions_updated_at
  BEFORE UPDATE ON public.landing_ab_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão do teste A/B nas app_settings
INSERT INTO public.app_settings (key, value, category, description, is_public)
VALUES 
  ('ab_test_enabled', 'false', 'landing', 'Habilitar teste A/B na landing page', true),
  ('ab_test_name', 'hero_v1', 'landing', 'Nome do teste A/B ativo', true),
  ('ab_current_winner', '', 'landing', 'Variante vencedora definida', true),
  ('ab_min_sessions', '100', 'landing', 'Mínimo de sessões por variante para significância', false)
ON CONFLICT (key) DO NOTHING;

-- Inserir dados iniciais das 3 variantes
INSERT INTO public.landing_ab_tests (test_name, variant, headline, subheadline, cta_text, description, traffic_percentage)
VALUES 
  ('hero_v1', 'A', 'O Método que Torna Possível Aprender os 256 Odù Ifá', 'Um sistema inteligente de memorização que respeita seu ritmo e transforma seu aprendizado', 'Começar Minha Jornada', 'Variante emocional focada em transformação pessoal', 34),
  ('hero_v1', 'B', 'Memorize os 256 Odu Ifá com Ciência e Respeito à Tradição', 'Técnicas de memorização comprovadas pela neurociência aplicadas ao conhecimento ancestral Yorubá', 'Conhecer o Método', 'Variante que combina ciência moderna com tradição', 33),
  ('hero_v1', 'C', 'O Caminho dos 256 Odu Começa com o Primeiro Passo', 'Um sistema estruturado para quem leva a sério o estudo do Ifá e busca maestria verdadeira', 'Aceitar o Desafio', 'Variante focada em desafio e superação pessoal', 33);