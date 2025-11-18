-- Criar tabela de notas pessoais
CREATE TABLE public.personal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  odu_id UUID NOT NULL REFERENCES public.odu(id) ON DELETE CASCADE,
  conteudo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_odu UNIQUE(user_id, odu_id)
);

-- Habilitar RLS
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Users can view their own personal notes"
  ON public.personal_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personal notes"
  ON public.personal_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personal notes"
  ON public.personal_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personal notes"
  ON public.personal_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_personal_notes_updated_at
  BEFORE UPDATE ON public.personal_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index para performance
CREATE INDEX idx_personal_notes_user_odu ON public.personal_notes(user_id, odu_id);