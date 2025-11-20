-- Create enum for referral status
CREATE TYPE referral_status AS ENUM ('pending', 'converted', 'expired');

-- Create referral_program table
CREATE TABLE public.referral_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  successful_conversions INTEGER NOT NULL DEFAULT 0,
  total_earned_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create referral_usage table
CREATE TABLE public.referral_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status referral_status NOT NULL DEFAULT 'pending',
  reward_type TEXT NOT NULL,
  reward_value INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_user_id)
);

-- Create referral_rewards table
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_description TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_program
CREATE POLICY "Users can view their own referral program"
  ON public.referral_program FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral program"
  ON public.referral_program FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral program"
  ON public.referral_program FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for referral_usage
CREATE POLICY "Users can view referrals they made or received"
  ON public.referral_usage FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can insert referral usage"
  ON public.referral_usage FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view their own rewards"
  ON public.referral_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards"
  ON public.referral_rewards FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_referral_program_user_id ON public.referral_program(user_id);
CREATE INDEX idx_referral_program_code ON public.referral_program(referral_code);
CREATE INDEX idx_referral_usage_referrer ON public.referral_usage(referrer_id);
CREATE INDEX idx_referral_usage_referred ON public.referral_usage(referred_user_id);
CREATE INDEX idx_referral_usage_status ON public.referral_usage(status);
CREATE INDEX idx_referral_rewards_user_id ON public.referral_rewards(user_id);
CREATE INDEX idx_referral_rewards_claimed ON public.referral_rewards(claimed);