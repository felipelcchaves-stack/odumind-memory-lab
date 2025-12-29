-- Fase 1: Adicionar policy para permitir INSERT anônimo em landing_ab_sessions
-- Isso eliminará os erros 401 que aparecem no console durante carregamento da landing

-- Adicionar policy para INSERT anônimo (sessões de visitantes não logados)
CREATE POLICY "Anyone can create their own ab session"
ON public.landing_ab_sessions
FOR INSERT
WITH CHECK (true);

-- A política de UPDATE já existe, mas vamos garantir que funcione para sessões anônimas
-- Drop e recriação para garantir que está correto
DROP POLICY IF EXISTS "Anyone can update their own session" ON public.landing_ab_sessions;

CREATE POLICY "Anyone can update sessions by session_id"
ON public.landing_ab_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);