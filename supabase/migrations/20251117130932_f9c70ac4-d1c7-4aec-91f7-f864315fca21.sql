-- Create table for tracking user tour progress
CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_completed BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 0,
  tour_version VARCHAR(10) DEFAULT '1.0',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, tour_version)
);

-- Enable RLS
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tour progress"
  ON public.user_tour_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tour progress"
  ON public.user_tour_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tour progress"
  ON public.user_tour_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_tour_progress_updated_at
  BEFORE UPDATE ON public.user_tour_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();