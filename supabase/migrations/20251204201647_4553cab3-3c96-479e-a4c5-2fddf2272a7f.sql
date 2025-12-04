-- Tabela de progresso de desbloqueio de técnicas
CREATE TABLE public.technique_unlock_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  technique_id TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, technique_id)
);

-- Habilitar RLS
ALTER TABLE public.technique_unlock_progress ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view own technique progress"
  ON public.technique_unlock_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own technique progress"
  ON public.technique_unlock_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own technique progress"
  ON public.technique_unlock_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Função para inicializar técnicas quando usuário é criado
CREATE OR REPLACE FUNCTION public.initialize_technique_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Técnicas básicas já desbloqueadas por padrão
  INSERT INTO public.technique_unlock_progress (user_id, technique_id, unlocked, unlocked_at)
  VALUES 
    (NEW.user_id, 'spaced-repetition', true, now()),
    (NEW.user_id, 'flashcards', true, now()),
    (NEW.user_id, 'elaborative-encoding', false, NULL),
    (NEW.user_id, 'mnemonics', false, NULL),
    (NEW.user_id, 'memory-palace', false, NULL)
  ON CONFLICT (user_id, technique_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger vinculado à criação de perfil
CREATE TRIGGER on_profile_created_init_techniques
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_technique_progress();