-- Create table for elaborative encoding notes
CREATE TABLE public.elaborative_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  odu_id UUID NOT NULL REFERENCES public.odu(id) ON DELETE CASCADE,
  pergunta_tipo TEXT NOT NULL CHECK (pergunta_tipo IN ('conexao_pessoal', 'relacao_outros_odus', 'aplicacao_pratica', 'emocao_sentimento', 'analogia', 'ensinar_outros')),
  resposta TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.elaborative_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own elaborative notes"
  ON public.elaborative_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own elaborative notes"
  ON public.elaborative_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own elaborative notes"
  ON public.elaborative_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own elaborative notes"
  ON public.elaborative_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_elaborative_notes_updated_at
  BEFORE UPDATE ON public.elaborative_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_elaborative_notes_user_odu ON public.elaborative_notes(user_id, odu_id);