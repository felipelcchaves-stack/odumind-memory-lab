-- Add onboarding_completed field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Indica se o usuário completou o onboarding inicial';