-- Isesemind: public.subscriptions and public.referral_rewards as the migrations leave them
-- (20251117112422, 20251120132258, 20251120155710, 20251126150831, 20251219024015,
-- 20260918210000), with their RLS policies, for the security fix tests.
CREATE TABLE public.profiles (user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, nome TEXT);
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'free',
  plan_name TEXT NOT NULL DEFAULT 'free',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_gateway TEXT DEFAULT 'guru',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert any subscription" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (has_admin_role(auth.uid()));
CREATE POLICY "Admins can update any subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (has_admin_role(auth.uid()));
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (has_admin_role(auth.uid()));
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_description TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own rewards" ON public.referral_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own rewards" ON public.referral_rewards FOR UPDATE USING (auth.uid() = user_id);

-- People: S = student with the free row from sign-up, N = student without a row, A = admin.
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'aluno1@example.com', now()),
  ('00000000-0000-0000-0000-0000000000f2', 'aluno2@example.com', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'admin2@ifatokun.com.br', now());
SELECT tests.make_member('00000000-0000-0000-0000-0000000000f1');
SELECT tests.make_member('00000000-0000-0000-0000-0000000000f2');
SELECT tests.make_admin('00000000-0000-0000-0000-0000000000a2');
INSERT INTO public.profiles (user_id) VALUES ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2');
INSERT INTO public.subscriptions (user_id, status, plan_name) VALUES ('00000000-0000-0000-0000-0000000000f1', 'free', 'Gratuito');
INSERT INTO public.referral_rewards (id, user_id, reward_type, reward_description, claimed) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1', 'premium_days_conversion', '30 dias Premium grátis por conversão de indicação', true);
