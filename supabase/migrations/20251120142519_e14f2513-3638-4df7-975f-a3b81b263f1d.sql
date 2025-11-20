-- Fix security issue: Set search_path for log_setting_change function
CREATE OR REPLACE FUNCTION log_setting_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_settings_audit (setting_key, old_value, new_value, changed_by)
  VALUES (NEW.key, OLD.value, NEW.value, NEW.updated_by);
  RETURN NEW;
END;
$$;