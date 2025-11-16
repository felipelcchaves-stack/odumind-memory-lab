-- Create enum for memorization status
CREATE TYPE public.status_memorizacao AS ENUM ('nao_estudado', 'estudando', 'memorizado');

-- Create table for memorization tracking
CREATE TABLE public.memorizacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  odu_id UUID NOT NULL REFERENCES public.odu(id) ON DELETE CASCADE,
  revisoes INTEGER NOT NULL DEFAULT 0,
  ultima_revisao TIMESTAMP WITH TIME ZONE,
  proxima_revisao TIMESTAMP WITH TIME ZONE,
  forca_memoria INTEGER NOT NULL DEFAULT 0 CHECK (forca_memoria >= 0 AND forca_memoria <= 100),
  facilidade DECIMAL NOT NULL DEFAULT 2.5,
  intervalo INTEGER NOT NULL DEFAULT 0,
  status public.status_memorizacao NOT NULL DEFAULT 'nao_estudado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, odu_id)
);

-- Enable Row Level Security
ALTER TABLE public.memorizacao ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own memorization records
CREATE POLICY "Users can view their own memorization"
ON public.memorizacao
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own memorization records
CREATE POLICY "Users can insert their own memorization"
ON public.memorizacao
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own memorization records
CREATE POLICY "Users can update their own memorization"
ON public.memorizacao
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_memorizacao_updated_at
BEFORE UPDATE ON public.memorizacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate next review date based on SM-2 algorithm
CREATE OR REPLACE FUNCTION public.calcular_proxima_revisao(
  _facilidade DECIMAL,
  _intervalo INTEGER,
  _qualidade INTEGER
)
RETURNS TABLE(nova_facilidade DECIMAL, novo_intervalo INTEGER, proxima_data TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
AS $$
DECLARE
  ef DECIMAL;
  intervalo_dias INTEGER;
BEGIN
  -- Update ease factor based on quality (0-5)
  ef := _facilidade + (0.1 - (5 - _qualidade) * (0.08 + (5 - _qualidade) * 0.02));
  
  -- Minimum ease factor is 1.3
  IF ef < 1.3 THEN
    ef := 1.3;
  END IF;
  
  -- Calculate new interval
  IF _qualidade < 3 THEN
    intervalo_dias := 1;
  ELSE
    IF _intervalo = 0 THEN
      intervalo_dias := 1;
    ELSIF _intervalo = 1 THEN
      intervalo_dias := 6;
    ELSE
      intervalo_dias := CEIL(_intervalo * ef);
    END IF;
  END IF;
  
  RETURN QUERY SELECT ef, intervalo_dias, (now() + (intervalo_dias || ' days')::INTERVAL);
END;
$$;