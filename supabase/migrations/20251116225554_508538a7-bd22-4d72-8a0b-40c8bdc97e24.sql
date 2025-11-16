-- Create table for user achievements/milestones
CREATE TABLE public.conquistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('primeiro_odu', 'progresso_10', 'progresso_25', 'progresso_50', 'progresso_75', 'progresso_100', 'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100', 'xp_100', 'xp_500', 'xp_1000', 'xp_5000', 'revisoes_100', 'revisoes_500', 'revisoes_1000')),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL,
  valor_conquista INTEGER NOT NULL,
  conquistado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conquistas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own achievements"
  ON public.conquistas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.conquistas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_conquistas_user_tipo ON public.conquistas(user_id, tipo);
CREATE INDEX idx_conquistas_data ON public.conquistas(user_id, conquistado_em DESC);

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_xp INTEGER;
  user_streak INTEGER;
  odus_memorizados INTEGER;
  total_odus INTEGER;
  total_revisoes INTEGER;
  progresso_percentual INTEGER;
BEGIN
  -- Get user stats
  SELECT xp, streak INTO user_xp, user_streak
  FROM profiles WHERE user_id = _user_id;
  
  -- Get memorized odus count
  SELECT COUNT(*) INTO odus_memorizados
  FROM memorizacao
  WHERE user_id = _user_id AND status = 'memorizado';
  
  -- Get total odus
  SELECT COUNT(*) INTO total_odus FROM odu;
  
  -- Get total reviews
  SELECT COALESCE(SUM(revisoes), 0) INTO total_revisoes
  FROM memorizacao
  WHERE user_id = _user_id;
  
  -- Calculate progress percentage
  IF total_odus > 0 THEN
    progresso_percentual := (odus_memorizados * 100) / total_odus;
  ELSE
    progresso_percentual := 0;
  END IF;
  
  -- Check primeiro_odu
  IF odus_memorizados >= 1 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'primeiro_odu'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'primeiro_odu', 'Primeiro Passo', 'Memorizou seu primeiro Odu!', '🌱', 1);
  END IF;
  
  -- Check progress milestones
  IF progresso_percentual >= 10 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'progresso_10'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'progresso_10', '10% Conquistado', 'Memorizou 10% dos 256 Odu!', '📚', 10);
  END IF;
  
  IF progresso_percentual >= 25 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'progresso_25'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'progresso_25', 'Um Quarto do Caminho', 'Memorizou 25% dos Odu!', '🎯', 25);
  END IF;
  
  IF progresso_percentual >= 50 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'progresso_50'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'progresso_50', 'Metade do Caminho', 'Memorizou 50% dos 256 Odu!', '💎', 50);
  END IF;
  
  IF progresso_percentual >= 75 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'progresso_75'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'progresso_75', 'Reta Final', 'Memorizou 75% dos Odu!', '🚀', 75);
  END IF;
  
  IF progresso_percentual >= 100 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'progresso_100'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'progresso_100', 'Mestre dos Odu', 'Memorizou todos os 256 Odu de Ifá!', '👑', 100);
  END IF;
  
  -- Check streak milestones
  IF user_streak >= 7 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'streak_7'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'streak_7', 'Uma Semana Dedicado', '7 dias consecutivos de estudo!', '🔥', 7);
  END IF;
  
  IF user_streak >= 14 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'streak_14'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'streak_14', 'Duas Semanas Imparável', '14 dias de sequência!', '⚡', 14);
  END IF;
  
  IF user_streak >= 30 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'streak_30'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'streak_30', 'Um Mês de Disciplina', '30 dias consecutivos!', '💪', 30);
  END IF;
  
  IF user_streak >= 60 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'streak_60'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'streak_60', 'Dois Meses Consistente', '60 dias de dedicação!', '🌟', 60);
  END IF;
  
  IF user_streak >= 100 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'streak_100'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'streak_100', 'Cem Dias Lendário', '100 dias de sequência incrível!', '🏆', 100);
  END IF;
  
  -- Check XP milestones
  IF user_xp >= 100 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'xp_100'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'xp_100', 'Primeiros 100 XP', 'Alcançou 100 pontos de experiência!', '⭐', 100);
  END IF;
  
  IF user_xp >= 500 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'xp_500'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'xp_500', 'Meio Milhar', 'Alcançou 500 XP!', '✨', 500);
  END IF;
  
  IF user_xp >= 1000 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'xp_1000'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'xp_1000', 'Mil Pontos', 'Alcançou 1000 XP!', '💫', 1000);
  END IF;
  
  IF user_xp >= 5000 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'xp_5000'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'xp_5000', 'Cinco Mil XP', 'Mestre com 5000 XP!', '🎖️', 5000);
  END IF;
  
  -- Check review milestones
  IF total_revisoes >= 100 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'revisoes_100'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'revisoes_100', 'Cem Revisões', 'Completou 100 revisões!', '📖', 100);
  END IF;
  
  IF total_revisoes >= 500 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'revisoes_500'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'revisoes_500', 'Quinhentas Revisões', 'Completou 500 revisões!', '📚', 500);
  END IF;
  
  IF total_revisoes >= 1000 AND NOT EXISTS (
    SELECT 1 FROM conquistas WHERE user_id = _user_id AND tipo = 'revisoes_1000'
  ) THEN
    INSERT INTO conquistas (user_id, tipo, titulo, descricao, icone, valor_conquista)
    VALUES (_user_id, 'revisoes_1000', 'Mil Revisões', 'Mestre revisor com 1000 revisões!', '🎓', 1000);
  END IF;
  
END;
$$;