-- Tabela de Caminhos de Aprendizado (cursos)
CREATE TABLE public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  icone text NOT NULL DEFAULT 'BookOpen',
  cor text NOT NULL DEFAULT 'amber',
  imagem_url text,
  ordem integer NOT NULL DEFAULT 1,
  ativo boolean DEFAULT true,
  requer_assinatura boolean DEFAULT true,
  total_conteudos integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar path_id na tabela learning_phases
ALTER TABLE public.learning_phases 
ADD COLUMN path_id uuid REFERENCES public.learning_paths(id);

-- Tabela de Conteúdo Genérico por Caminho
CREATE TABLE public.path_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.learning_phases(id) ON DELETE SET NULL,
  numero integer,
  nome text NOT NULL,
  texto_principal text NOT NULL,
  verso text,
  verso_resumido text,
  significado text,
  contexto_historico text,
  exemplos_praticos text,
  tags text[],
  materiais_necessarios text[],
  tempo_execucao integer,
  dificuldade text DEFAULT 'iniciante',
  audio_url text,
  imagem_url text,
  ordem integer DEFAULT 1,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de Progresso do Usuário por Conteúdo de Caminho
CREATE TABLE public.user_path_content_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  path_id uuid REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.path_content(id) ON DELETE CASCADE,
  status text DEFAULT 'nao_estudado' CHECK (status IN ('nao_estudado', 'estudando', 'memorizado')),
  forca_memoria integer DEFAULT 0,
  facilidade numeric DEFAULT 2.5,
  intervalo integer DEFAULT 0,
  revisoes integer DEFAULT 0,
  ultima_revisao timestamptz,
  proxima_revisao timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable RLS
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_path_content_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_paths
CREATE POLICY "Anyone can view active learning paths"
ON public.learning_paths FOR SELECT
USING (ativo = true OR has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert learning paths"
ON public.learning_paths FOR INSERT
WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can update learning paths"
ON public.learning_paths FOR UPDATE
USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete learning paths"
ON public.learning_paths FOR DELETE
USING (has_admin_role(auth.uid()));

-- RLS Policies for path_content
CREATE POLICY "Anyone can view active path content"
ON public.path_content FOR SELECT
USING (ativo = true OR has_colaborador_role(auth.uid()));

CREATE POLICY "Colaboradores can insert path content"
ON public.path_content FOR INSERT
WITH CHECK (has_colaborador_role(auth.uid()));

CREATE POLICY "Colaboradores can update path content"
ON public.path_content FOR UPDATE
USING (has_colaborador_role(auth.uid()));

CREATE POLICY "Colaboradores can delete path content"
ON public.path_content FOR DELETE
USING (has_colaborador_role(auth.uid()));

-- RLS Policies for user_path_content_progress
CREATE POLICY "Users can view their own path progress"
ON public.user_path_content_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own path progress"
ON public.user_path_content_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own path progress"
ON public.user_path_content_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_learning_paths_slug ON public.learning_paths(slug);
CREATE INDEX idx_learning_paths_ordem ON public.learning_paths(ordem);
CREATE INDEX idx_learning_phases_path_id ON public.learning_phases(path_id);
CREATE INDEX idx_path_content_path_id ON public.path_content(path_id);
CREATE INDEX idx_path_content_phase_id ON public.path_content(phase_id);
CREATE INDEX idx_user_path_content_progress_user_id ON public.user_path_content_progress(user_id);
CREATE INDEX idx_user_path_content_progress_path_id ON public.user_path_content_progress(path_id);

-- Trigger for updated_at
CREATE TRIGGER update_learning_paths_updated_at
BEFORE UPDATE ON public.learning_paths
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_path_content_updated_at
BEFORE UPDATE ON public.path_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_path_content_progress_updated_at
BEFORE UPDATE ON public.user_path_content_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default "Caminho de Ifá" path
INSERT INTO public.learning_paths (slug, nome, descricao, icone, cor, ordem, requer_assinatura, total_conteudos)
VALUES (
  'caminho-ifa', 
  'Caminho de Ifá', 
  'Memorize os 256 Odu sagrados de Ifá através de um método estruturado e gamificado.',
  'BookOpen',
  'amber',
  1,
  false,
  256
);

-- Update existing learning_phases to link to Caminho de Ifá
UPDATE public.learning_phases 
SET path_id = (SELECT id FROM public.learning_paths WHERE slug = 'caminho-ifa');