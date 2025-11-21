-- Create content_types table
CREATE TABLE IF NOT EXISTS public.content_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  descricao TEXT,
  icon TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ritual_content table
CREATE TABLE IF NOT EXISTS public.ritual_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID REFERENCES public.content_types(id) ON DELETE CASCADE,
  numero INTEGER,
  nome TEXT NOT NULL,
  texto_principal TEXT NOT NULL,
  materiais_necessarios TEXT[],
  tempo_execucao INTEGER, -- em minutos
  dificuldade TEXT CHECK (dificuldade IN ('iniciante', 'intermediario', 'avancado')),
  odu_relacionados UUID[], -- array de IDs de odu relacionados
  tags TEXT[],
  verso_resumido TEXT,
  contexto_historico TEXT,
  exemplos_praticos TEXT,
  audio_url TEXT, -- para rezas/invocações
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_ritual_progress table
CREATE TABLE IF NOT EXISTS public.user_ritual_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ritual_id UUID REFERENCES public.ritual_content(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('nao_estudado', 'estudando', 'praticado')) DEFAULT 'nao_estudado',
  vezes_praticado INTEGER DEFAULT 0,
  ultima_pratica TIMESTAMP WITH TIME ZONE,
  proxima_revisao TIMESTAMP WITH TIME ZONE,
  notas_pessoais TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ritual_id)
);

-- Enable RLS
ALTER TABLE public.content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ritual_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_types
CREATE POLICY "Anyone can view content types"
  ON public.content_types FOR SELECT
  USING (true);

CREATE POLICY "Admins and Colaboradores can manage content types"
  ON public.content_types FOR ALL
  USING (has_colaborador_role(auth.uid()));

-- RLS Policies for ritual_content
CREATE POLICY "Anyone can view ritual content"
  ON public.ritual_content FOR SELECT
  USING (true);

CREATE POLICY "Admins and Colaboradores can insert ritual content"
  ON public.ritual_content FOR INSERT
  WITH CHECK (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can update ritual content"
  ON public.ritual_content FOR UPDATE
  USING (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can delete ritual content"
  ON public.ritual_content FOR DELETE
  USING (has_colaborador_role(auth.uid()));

-- RLS Policies for user_ritual_progress
CREATE POLICY "Users can view their own ritual progress"
  ON public.user_ritual_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ritual progress"
  ON public.user_ritual_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ritual progress"
  ON public.user_ritual_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ritual progress"
  ON public.user_ritual_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_ritual_content_type ON public.ritual_content(content_type_id);
CREATE INDEX idx_ritual_content_dificuldade ON public.ritual_content(dificuldade);
CREATE INDEX idx_user_ritual_progress_user ON public.user_ritual_progress(user_id);
CREATE INDEX idx_user_ritual_progress_ritual ON public.user_ritual_progress(ritual_id);
CREATE INDEX idx_user_ritual_progress_status ON public.user_ritual_progress(status);

-- Add updated_at trigger
CREATE TRIGGER update_content_types_updated_at
  BEFORE UPDATE ON public.content_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ritual_content_updated_at
  BEFORE UPDATE ON public.ritual_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_ritual_progress_updated_at
  BEFORE UPDATE ON public.user_ritual_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content types
INSERT INTO public.content_types (nome, slug, descricao, icon, ordem) VALUES
  ('Odu Ifá', 'odu', 'Os 256 Odu sagrados do Ifá', 'BookOpen', 1),
  ('Rituais', 'rituais', 'Rituais e cerimônias da tradição Yorubá', 'Flame', 2),
  ('Rezas', 'rezas', 'Orações e invocações sagradas', 'Heart', 3),
  ('Invocações', 'invocacoes', 'Chamados aos Orixás e forças espirituais', 'Sparkles', 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample ritual content
INSERT INTO public.ritual_content (
  content_type_id, 
  numero, 
  nome, 
  texto_principal, 
  materiais_necessarios,
  tempo_execucao,
  dificuldade,
  tags,
  contexto_historico
) 
SELECT 
  ct.id,
  1,
  'Ritual de Abertura de Caminhos',
  'Este ritual é realizado para abrir os caminhos e remover obstáculos. É dedicado a Exu, o mensageiro entre os mundos.',
  ARRAY['vela vermelha', 'dendê', 'farofa', 'cachaça'],
  30,
  'iniciante',
  ARRAY['abertura', 'exu', 'caminhos'],
  'Ritual tradicional yorubá praticado há séculos para solicitar a intervenção de Exu na abertura de oportunidades.'
FROM public.content_types ct
WHERE ct.slug = 'rituais'
ON CONFLICT DO NOTHING;

-- Add new badges for rituals
INSERT INTO public.badges (code, nome, descricao, icon, requisito_tipo, requisito_valor) VALUES
  ('ritualista_iniciante', 'Ritualista Iniciante', 'Praticou 5 rituais', '🕯️', 'rituais_praticados', 5),
  ('mestre_rituais', 'Mestre de Rituais', 'Praticou 25 rituais', '🔥', 'rituais_praticados', 25),
  ('devoto', 'Devoto', 'Memorizou 10 rezas', '🙏', 'rezas_memorizadas', 10),
  ('invocador', 'Invocador', 'Dominou todas as invocações', '✨', 'invocacoes_dominadas', 20)
ON CONFLICT (code) DO NOTHING;