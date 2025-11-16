-- Fix function search path security issue
DROP FUNCTION IF EXISTS public.calcular_proxima_revisao(DECIMAL, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.calcular_proxima_revisao(
  _facilidade DECIMAL,
  _intervalo INTEGER,
  _qualidade INTEGER
)
RETURNS TABLE(nova_facilidade DECIMAL, novo_intervalo INTEGER, proxima_data TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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