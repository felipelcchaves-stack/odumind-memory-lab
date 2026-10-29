-- Before the fix: the attacks WORK.
\set ON_ERROR_STOP 1
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}');
UPDATE public.subscriptions SET status = 'active', plan_name = 'Premium', current_period_end = '2099-01-01' WHERE user_id = auth.uid();
UPDATE public.referral_rewards SET claimed = false, reward_type = 'premium_days', reward_description = '3650 dias Premium' WHERE user_id = auth.uid();
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}');
INSERT INTO public.subscriptions (user_id, status, plan_name, current_period_end) VALUES (auth.uid(), 'active', 'Premium', '2099-01-01');
RESET ROLE;
SELECT tests.assert((SELECT status = 'active' FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-0000000000f1'), 'before: student gave themselves a paid plan (update)');
SELECT tests.assert((SELECT status = 'active' FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-0000000000f2'), 'before: student gave themselves a paid plan (insert)');
SELECT tests.assert((SELECT NOT claimed AND reward_description LIKE '3650%' FROM public.referral_rewards WHERE id = '50000000-0000-0000-0000-000000000001'), 'before: student rewrote a reward');
-- Back to the starting state.
UPDATE public.subscriptions SET status = 'free', plan_name = 'Gratuito', current_period_end = NULL WHERE user_id = '00000000-0000-0000-0000-0000000000f1';
DELETE FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-0000000000f2';
UPDATE public.referral_rewards SET claimed = true, reward_type = 'premium_days_conversion', reward_description = '30 dias Premium grátis por conversão de indicação';
