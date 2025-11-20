-- Create app_settings table for storing application configurations
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_public boolean DEFAULT false,
  is_sensitive boolean DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_app_settings_key ON public.app_settings(key);
CREATE INDEX idx_app_settings_category ON public.app_settings(category);
CREATE INDEX idx_app_settings_is_public ON public.app_settings(is_public);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view public settings (for pixel loading)
CREATE POLICY "Anyone can view public settings"
  ON public.app_settings
  FOR SELECT
  USING (is_public = true);

-- Policy: Admins can view all settings
CREATE POLICY "Admins can view all settings"
  ON public.app_settings
  FOR SELECT
  USING (has_admin_role(auth.uid()));

-- Policy: Admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON public.app_settings
  FOR INSERT
  WITH CHECK (has_admin_role(auth.uid()));

-- Policy: Admins can update settings
CREATE POLICY "Admins can update settings"
  ON public.app_settings
  FOR UPDATE
  USING (has_admin_role(auth.uid()));

-- Policy: Admins can delete settings
CREATE POLICY "Admins can delete settings"
  ON public.app_settings
  FOR DELETE
  USING (has_admin_role(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pixel tracking settings
INSERT INTO public.app_settings (key, value, category, description, is_public, is_sensitive) VALUES
  ('meta_pixel_id', '', 'tracking', 'Meta Pixel ID (Facebook/Instagram)', true, false),
  ('google_analytics_id', '', 'tracking', 'Google Analytics 4 Measurement ID', true, false),
  ('tiktok_pixel_id', '', 'tracking', 'TikTok Pixel Code', true, false),
  ('linkedin_partner_id', '', 'tracking', 'LinkedIn Insight Tag Partner ID', true, false),
  ('tracking_enabled', 'true', 'tracking', 'Enable/disable all tracking', true, false)
ON CONFLICT (key) DO NOTHING;

-- Create audit log table for settings changes
CREATE TABLE IF NOT EXISTS public.app_settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone DEFAULT now(),
  change_reason text
);

-- Enable RLS on audit table
ALTER TABLE public.app_settings_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.app_settings_audit
  FOR SELECT
  USING (has_admin_role(auth.uid()));

-- Policy: Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON public.app_settings_audit
  FOR INSERT
  WITH CHECK (has_admin_role(auth.uid()));

-- Create function to log setting changes
CREATE OR REPLACE FUNCTION log_setting_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_settings_audit (setting_key, old_value, new_value, changed_by)
  VALUES (NEW.key, OLD.value, NEW.value, NEW.updated_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
CREATE TRIGGER log_app_settings_changes
  AFTER UPDATE ON public.app_settings
  FOR EACH ROW
  WHEN (OLD.value IS DISTINCT FROM NEW.value)
  EXECUTE FUNCTION log_setting_change();