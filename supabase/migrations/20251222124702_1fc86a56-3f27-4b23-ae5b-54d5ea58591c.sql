-- Add dashboard_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dashboard_preferences jsonb DEFAULT '{"show_daily_guide": true}'::jsonb;