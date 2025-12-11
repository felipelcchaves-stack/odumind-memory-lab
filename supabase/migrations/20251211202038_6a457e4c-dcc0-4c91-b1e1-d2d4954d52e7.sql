-- Create UTM tracking table
CREATE TABLE IF NOT EXISTS public.utm_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  referrer TEXT,
  landing_page TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.utm_tracking ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read all records
CREATE POLICY "Admins can read all UTM data"
ON public.utm_tracking
FOR SELECT
USING (has_admin_role(auth.uid()));

-- Policy for users to insert their own UTM data
CREATE POLICY "Users can insert their own UTM data"
ON public.utm_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create index for faster queries
CREATE INDEX idx_utm_tracking_created_at ON public.utm_tracking(created_at DESC);
CREATE INDEX idx_utm_tracking_source ON public.utm_tracking(utm_source);
CREATE INDEX idx_utm_tracking_campaign ON public.utm_tracking(utm_campaign);