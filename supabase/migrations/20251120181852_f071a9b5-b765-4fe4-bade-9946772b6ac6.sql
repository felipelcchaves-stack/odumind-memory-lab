-- Create function to get latest subscription for each user
CREATE OR REPLACE FUNCTION get_latest_subscriptions(user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  plan_name text,
  status text,
  stripe_customer_id text,
  stripe_subscription_id text,
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
    stripe_customer_id,
    stripe_subscription_id,
    updated_at
  FROM public.subscriptions
  WHERE user_id = ANY(user_ids)
  ORDER BY user_id, updated_at DESC;
$$;