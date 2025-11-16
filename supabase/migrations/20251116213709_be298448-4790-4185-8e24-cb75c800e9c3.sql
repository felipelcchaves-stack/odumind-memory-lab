-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icon TEXT NOT NULL,
  requisito_tipo TEXT NOT NULL, -- 'streak', 'xp', 'odus_memorizados', 'dias_consecutivos'
  requisito_valor INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  conquistado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create gamification logs table
CREATE TABLE public.gamification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL, -- 'xp_ganho', 'streak_updated', 'badge_conquistado', 'revisao_completa'
  valor INTEGER NOT NULL DEFAULT 0,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add last_study_date to profiles for streak calculation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_study_date DATE;

-- Enable Row Level Security
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_logs ENABLE ROW LEVEL SECURITY;

-- Policies for badges (public read)
CREATE POLICY "Anyone can view badges"
ON public.badges
FOR SELECT
USING (true);

-- Policies for user_badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
ON public.user_badges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policies for gamification_logs
CREATE POLICY "Users can view their own logs"
ON public.gamification_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
ON public.gamification_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert initial badges
INSERT INTO public.badges (code, nome, descricao, icon, requisito_tipo, requisito_valor) VALUES
('primeiro_odu', 'Primeiro Odu', 'Memorizou seu primeiro Odu Ifá', '🌱', 'odus_memorizados', 1),
('iniciante', 'Iniciante Dedicado', 'Manteve um streak de 3 dias', '🔥', 'streak', 3),
('persistente', 'Persistente', 'Manteve um streak de 7 dias', '⚡', 'streak', 7),
('mestre_14_dias', 'Mestre dos 14 Dias', 'Completou o desafio de 14 dias consecutivos', '🏆', 'streak', 14),
('explorador', 'Explorador de Odu', 'Memorizou 10 Odu', '📚', 'odus_memorizados', 10),
('estudioso', 'Estudioso', 'Memorizou 25 Odu', '🎓', 'odus_memorizados', 25),
('sabio', 'Sábio', 'Memorizou 50 Odu', '🧙', 'odus_memorizados', 50),
('mestre_odu', 'Mestre dos Odu', 'Memorizou 100 Odu', '👑', 'odus_memorizados', 100),
('campeao_xp', 'Campeão de XP', 'Alcançou 1000 XP', '💎', 'xp', 1000),
('lenda', 'Lenda Viva', 'Alcançou 5000 XP', '🌟', 'xp', 5000);

-- Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_record RECORD;
  user_xp INTEGER;
  user_streak INTEGER;
  odus_memorizados INTEGER;
BEGIN
  -- Get user stats
  SELECT xp, streak INTO user_xp, user_streak
  FROM profiles WHERE user_id = _user_id;
  
  -- Get memorized odus count
  SELECT COUNT(*) INTO odus_memorizados
  FROM memorizacao
  WHERE user_id = _user_id AND status = 'memorizado';
  
  -- Check all badges
  FOR badge_record IN SELECT * FROM badges LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM user_badges 
      WHERE user_id = _user_id AND badge_id = badge_record.id
    ) THEN
      -- Check if user meets requirements
      IF (badge_record.requisito_tipo = 'xp' AND user_xp >= badge_record.requisito_valor) OR
         (badge_record.requisito_tipo = 'streak' AND user_streak >= badge_record.requisito_valor) OR
         (badge_record.requisito_tipo = 'odus_memorizados' AND odus_memorizados >= badge_record.requisito_valor) THEN
        
        -- Award badge
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (_user_id, badge_record.id);
        
        -- Log the event
        INSERT INTO gamification_logs (user_id, tipo_evento, valor, detalhes)
        VALUES (_user_id, 'badge_conquistado', 0, jsonb_build_object('badge_code', badge_record.code, 'badge_nome', badge_record.nome));
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_date DATE;
  current_streak INTEGER;
  today DATE := CURRENT_DATE;
BEGIN
  -- Get current streak and last study date
  SELECT streak, last_study_date INTO current_streak, last_date
  FROM profiles WHERE user_id = _user_id;
  
  -- If never studied, initialize
  IF last_date IS NULL THEN
    UPDATE profiles 
    SET streak = 1, last_study_date = today
    WHERE user_id = _user_id;
    RETURN;
  END IF;
  
  -- If studying today for the first time
  IF last_date < today THEN
    -- If studied yesterday, increment streak
    IF last_date = today - INTERVAL '1 day' THEN
      UPDATE profiles 
      SET streak = current_streak + 1, last_study_date = today
      WHERE user_id = _user_id;
      
      -- Log streak update
      INSERT INTO gamification_logs (user_id, tipo_evento, valor)
      VALUES (_user_id, 'streak_updated', current_streak + 1);
    ELSE
      -- Streak broken, reset to 1
      UPDATE profiles 
      SET streak = 1, last_study_date = today
      WHERE user_id = _user_id;
      
      -- Log streak reset
      INSERT INTO gamification_logs (user_id, tipo_evento, valor)
      VALUES (_user_id, 'streak_reset', 1);
    END IF;
  END IF;
END;
$$;