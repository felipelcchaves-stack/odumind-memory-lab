-- SECURITY FIX (independent of the hub login: safe to apply on its own, before or after the hub_sso
-- migrations). Replaces supabase/proposed/drop_user_write_on_subscriptions.sql. Idempotent.
--
-- DEPLOY ORDER: deploy the claim-referral-rewards Edge Function from this same commit FIRST. The old
-- version ran its queries with the student's JWT and relied on the two policies dropped below.
--
-- Problem: "Users can insert their own subscription" / "Users can update their own subscription"
-- (20251117112422) only check auth.uid() = user_id, so any signed-in student can give themselves a
-- paid plan through the public API:
--   supabase.from('subscriptions').update({ status: 'active', plan_name: 'Premium',
--     current_period_end: '2099-01-01' }).eq('user_id', myId)
-- Second way to the same result: "Users can update their own rewards" (20251120132258) lets a
-- student edit their referral_rewards rows (claimed = false, reward_description = '3650 dias ...'),
-- and claim-referral-rewards turns the description into Premium days.
--
-- Who legitimately writes these tables today (checked in the code, 2026-10-09):
--   subscriptions
--   * service role (bypasses RLS): guru-webhook, check-subscription, change-own-subscription,
--     admin-change-subscription, check-referral-conversion, expire-subscriptions,
--     fix-family-group, auto-renewal-offers / notify-expiring-subscriptions (read);
--     claim-referral-rewards from this commit on (before: the student's JWT, see above);
--   * SECURITY DEFINER functions: initialize_free_subscription (sign-up), expire_overdue_subscriptions;
--   * the admin page in the browser (AdminSubscriptionsPage "Reativar"): policies
--     "Admins can insert/update any subscription" (has_admin_role), kept;
--   * the student's browser only READS its row (useSubscription, useAllLearningPaths).
--   referral_rewards
--   * service role: check-referral-conversion (creates, marks claimed), claim-referral-rewards;
--   * the student's browser only READS (Referral.tsx).
-- So the three student write policies can simply go. Reading is unchanged.

DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own rewards" ON public.referral_rewards;
