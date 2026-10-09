-- PROPOSED FIX — NOT a migration, NOT applied. Review, then move to supabase/migrations/ with a
-- new timestamp if you want it. Found while adding the hub login (deploy/HUB-SSO.md, "Achados").
--
-- Pre-existing problem (as far as the repository migrations show; confirm on the live project
-- with: SELECT policyname, cmd FROM pg_policies WHERE tablename = 'subscriptions';):
-- 20251117112422 created "Users can insert their own subscription" and "Users can update their own
-- subscription" on public.subscriptions with only auth.uid() = user_id. Any signed-in student can
-- give themselves a paid plan through the public API, e.g.
--   supabase.from('subscriptions').update({ status: 'active', plan_name: '...',
--     current_period_end: '2099-01-01' }).eq('user_id', myId)
-- The app itself only writes subscriptions from the admin page (admin policies, kept) and from
-- Edge Functions with the service role (guru-webhook, change-own-subscription, ...), which bypass
-- RLS. So the two user policies can simply go.
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
