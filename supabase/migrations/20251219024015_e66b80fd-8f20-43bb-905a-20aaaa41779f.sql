-- Allow admins to view all subscriptions for analytics
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (has_admin_role(auth.uid()));