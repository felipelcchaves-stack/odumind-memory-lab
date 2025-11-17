-- Criar tabela de perfil de aprendizagem do usuário
CREATE TABLE IF NOT EXISTS public.user_learning_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  fast_learner BOOLEAN NOT NULL DEFAULT false,
  needs_reinforcement BOOLEAN NOT NULL DEFAULT false,
  optimal_session_time INTEGER NOT NULL DEFAULT 20,
  weak_odus TEXT[] DEFAULT '{}',
  best_study_hour INTEGER,
  average_accuracy DECIMAL NOT NULL DEFAULT 0,
  average_speed INTEGER NOT NULL DEFAULT 0,
  learning_curve_data JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índice para melhor performance
CREATE INDEX idx_user_learning_profile_user_id ON public.user_learning_profile(user_id);

-- Adicionar campos extras na tabela memorizacao para tracking
ALTER TABLE public.memorizacao 
  ADD COLUMN IF NOT EXISTS marked_difficult BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consecutive_correct INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_wrong INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_study_time INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_response_time INTEGER;

-- Criar tabela de sessões de estudo para analytics
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_cards INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  average_response_time INTEGER,
  session_mode TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);

-- Criar tabela para rastrear regras de desbloqueio
CREATE TABLE IF NOT EXISTS public.unlock_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_limit INTEGER NOT NULL DEFAULT 5,
  next_unlock INTEGER NOT NULL DEFAULT 10,
  unlock_requirement_type TEXT NOT NULL DEFAULT 'mastery',
  unlock_requirement_value INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_unlock_progress_user_id ON public.unlock_progress(user_id);

-- Enable RLS
ALTER TABLE public.user_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies para user_learning_profile
CREATE POLICY "Users can view their own learning profile"
  ON public.user_learning_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning profile"
  ON public.user_learning_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning profile"
  ON public.user_learning_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies para study_sessions
CREATE POLICY "Users can view their own study sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions"
  ON public.study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies para unlock_progress
CREATE POLICY "Users can view their own unlock progress"
  ON public.unlock_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlock progress"
  ON public.unlock_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unlock progress"
  ON public.unlock_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_learning_profile_updated_at
  BEFORE UPDATE ON public.user_learning_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_unlock_progress_updated_at
  BEFORE UPDATE ON public.unlock_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para inicializar perfil de aprendizagem ao criar usuário
CREATE OR REPLACE FUNCTION public.initialize_learning_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_learning_profile (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.unlock_progress (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar perfil quando profile é criado
CREATE TRIGGER on_profile_created_learning
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_learning_profile();