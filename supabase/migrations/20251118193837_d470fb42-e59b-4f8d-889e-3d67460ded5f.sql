-- Create study_schedule table to store user availability
CREATE TABLE IF NOT EXISTS public.study_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0 = domingo, 6 = sábado
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  duracao_minutos INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (hora_fim - hora_inicio)) / 60) STORED,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dia_semana, hora_inicio)
);

-- Create study_plan table to store generated AI plans
CREATE TABLE IF NOT EXISTS public.study_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano_completo JSONB NOT NULL, -- { dias: [...], estimativa_dias: N, sessoes_por_semana: X }
  estimativa_dias INTEGER NOT NULL,
  data_inicio DATE,
  data_fim_estimada DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_schedule
CREATE POLICY "Users can view their own study schedule"
  ON public.study_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study schedule"
  ON public.study_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study schedule"
  ON public.study_schedule FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study schedule"
  ON public.study_schedule FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for study_plan
CREATE POLICY "Users can view their own study plan"
  ON public.study_plan FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plan"
  ON public.study_plan FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plan"
  ON public.study_plan FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plan"
  ON public.study_plan FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_study_schedule_updated_at
  BEFORE UPDATE ON public.study_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_plan_updated_at
  BEFORE UPDATE ON public.study_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();