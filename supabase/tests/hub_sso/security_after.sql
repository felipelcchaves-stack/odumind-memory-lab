-- After the fix (applied twice): the attacks are blocked; reading, the admin page and server code still work.
\set ON_ERROR_STOP 1
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}');
UPDATE public.subscriptions SET status = 'active', plan_name = 'Premium', current_period_end = '2099-01-01' WHERE user_id = auth.uid();
UPDATE public.referral_rewards SET claimed = false, reward_type = 'premium_days', reward_description = '3650 dias Premium' WHERE user_id = auth.uid();
SELECT tests.assert((SELECT count(*) FROM public.subscriptions WHERE user_id = auth.uid()) = 1, 'student still reads own subscription');
SELECT tests.assert((SELECT count(*) FROM public.referral_rewards WHERE user_id = auth.uid()) = 1, 'student still reads own rewards');
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}');
DO $$ BEGIN
  INSERT INTO public.subscriptions (user_id, status, plan_name) VALUES (auth.uid(), 'active', 'Premium');
  RAISE EXCEPTION 'FAILED: student inserted a subscription';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
RESET ROLE;
SELECT tests.assert((SELECT status = 'free' AND current_period_end IS NULL FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-0000000000f1'), 'update blocked (0 rows)');
SELECT tests.assert(NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-0000000000f2'), 'insert blocked');
SELECT tests.assert((SELECT claimed AND reward_description LIKE '30 %' FROM public.referral_rewards WHERE id = '50000000-0000-0000-0000-000000000001'), 'reward rewrite blocked');

-- Admin page ("Reativar"), browser with the admin role: still works.
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}');
UPDATE public.subscriptions SET status = 'active', plan_name = 'Premium', current_period_end = now() + interval '30 days' WHERE user_id = '00000000-0000-0000-0000-0000000000f1';
INSERT INTO public.subscriptions (user_id, status, plan_name) VALUES ('00000000-0000-0000-0000-0000000000f2', 'active', 'Premium');
RESET ROLE;
SELECT tests.assert((SELECT status = 'active' FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-0000000000f1'), 'admin reactivates');
SELECT tests.assert((SELECT status = 'active' FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-0000000000f2'), 'admin inserts');

-- Server code (service role): guru-webhook, claim-referral-rewards (upsert on user_id), conversions.
SET ROLE service_role;
SELECT tests.as_claims('{"role": "service_role"}');
UPDATE public.subscriptions SET status = 'expired', plan_name = 'Gratuito' WHERE user_id = '00000000-0000-0000-0000-0000000000f1';
INSERT INTO public.subscriptions (user_id, status, plan_name, current_period_end) VALUES ('00000000-0000-0000-0000-0000000000f1', 'active', 'Premium', now() + interval '7 days')
  ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, plan_name = EXCLUDED.plan_name, current_period_end = EXCLUDED.current_period_end;
UPDATE public.referral_rewards SET claimed = false WHERE id = '50000000-0000-0000-0000-000000000001' AND claimed = true;
RESET ROLE;
SELECT tests.assert((SELECT status = 'active' AND plan_name = 'Premium' FROM public.subscriptions WHERE user_id = '00000000-0000-0000-0000-0000000000f1'), 'service role upserts');
SELECT tests.assert((SELECT NOT claimed FROM public.referral_rewards WHERE id = '50000000-0000-0000-0000-000000000001'), 'service role updates rewards');
-- No student write policy left on either table.
SELECT tests.assert(NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename IN ('subscriptions', 'referral_rewards') AND cmd IN ('INSERT', 'UPDATE', 'ALL')
  AND policyname NOT LIKE 'Admins %'), 'only admin write policies left');
SELECT tests.as_claims('{}');
