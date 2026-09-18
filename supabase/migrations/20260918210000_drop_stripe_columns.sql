-- Final Stripe cleanup, deferred on purpose during the earlier removal pass
-- (dropping columns is harder to undo than just leaving unused ones around
-- while other code was still being edited). Everything reading/writing
-- these columns was already removed from src/ and supabase/functions/.

-- Real bug found while doing this: subscriptions.payment_gateway still
-- defaulted to 'stripe', and initialize_free_subscription() - the trigger
-- that creates a subscriptions row for every new signup - never sets
-- payment_gateway explicitly. Every new signup was silently getting
-- payment_gateway='stripe' again, recreating the exact mislabeling this
-- migration's earlier sibling fixed for the 7 legacy rows. Fixing the
-- default closes that for good.
ALTER TABLE public.subscriptions ALTER COLUMN payment_gateway SET DEFAULT 'guru';

-- get_latest_subscriptions() explicitly selects stripe_customer_id/
-- stripe_subscription_id - has to be redefined before those columns are
-- dropped, or every call breaks at runtime (Postgres doesn't validate a
-- SQL function body against the schema until it's actually invoked).
DROP FUNCTION IF EXISTS public.get_latest_subscriptions(uuid[]);

CREATE FUNCTION public.get_latest_subscriptions(user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  plan_name text,
  status text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (user_id)
    user_id,
    plan_name,
    status,
    updated_at
  FROM public.subscriptions
  WHERE user_id = ANY(user_ids)
  ORDER BY user_id, updated_at DESC;
$$;

ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_price_id;

ALTER TABLE public.family_groups
  DROP COLUMN IF EXISTS stripe_subscription_id;

ALTER TABLE public.subscription_changes
  DROP COLUMN IF EXISTS old_stripe_subscription_id,
  DROP COLUMN IF EXISTS new_stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_response;

ALTER TABLE public.discount_coupons
  DROP COLUMN IF EXISTS stripe_coupon_id;
