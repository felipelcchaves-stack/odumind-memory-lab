-- Fase 1: Adicionar campo auto_finalized
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS auto_finalized BOOLEAN DEFAULT false;

-- Fase 1: Função para limpar sessões abandonadas
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE study_sessions
  SET 
    ended_at = started_at + interval '2 hours',
    auto_finalized = true,
    total_cards = COALESCE(correct_answers, 0) + COALESCE(wrong_answers, 0)
  WHERE 
    ended_at IS NULL 
    AND started_at < NOW() - interval '2 hours';
END;
$$;

-- Fase 3: Corrigir sessões históricas abandonadas
UPDATE study_sessions
SET 
  ended_at = started_at + interval '1 hour',
  auto_finalized = true,
  total_cards = COALESCE(correct_answers, 0) + COALESCE(wrong_answers, 0)
WHERE 
  ended_at IS NULL 
  AND started_at < CURRENT_DATE;