-- Create table for mnemonics (user-created and AI-generated)
CREATE TABLE public.mnemonics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  odu_id UUID NOT NULL REFERENCES public.odu(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('acronimo', 'frase', 'rima', 'associacao', 'imagem')),
  conteudo TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Memory Palace configuration
CREATE TABLE public.memory_palace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  odu_id UUID NOT NULL REFERENCES public.odu(id) ON DELETE CASCADE,
  sala INTEGER NOT NULL CHECK (sala >= 1 AND sala <= 16), -- 16 salas no palácio
  posicao INTEGER NOT NULL CHECK (posicao >= 1 AND posicao <= 16), -- 16 posições por sala
  nota_visual TEXT, -- Nota sobre a imagem mental associada
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sala, posicao),
  UNIQUE(user_id, odu_id)
);

-- Enable RLS
ALTER TABLE public.mnemonics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_palace ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mnemonics
CREATE POLICY "Users can view their own mnemonics"
  ON public.mnemonics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mnemonics"
  ON public.mnemonics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mnemonics"
  ON public.mnemonics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mnemonics"
  ON public.mnemonics FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for memory_palace
CREATE POLICY "Users can view their own memory palace"
  ON public.memory_palace FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own memory palace"
  ON public.memory_palace FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory palace"
  ON public.memory_palace FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own memory palace"
  ON public.memory_palace FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_mnemonics_updated_at
  BEFORE UPDATE ON public.mnemonics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memory_palace_updated_at
  BEFORE UPDATE ON public.memory_palace
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();