-- Add RLS policies to allow admins to insert and update any subscription
CREATE POLICY "Admins can insert any subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_role(auth.uid())
);

CREATE POLICY "Admins can update any subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  has_admin_role(auth.uid())
);