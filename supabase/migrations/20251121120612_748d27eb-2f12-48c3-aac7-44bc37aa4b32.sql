-- Create collaborator_permissions table
CREATE TABLE IF NOT EXISTS public.collaborator_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_type TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_type)
);

-- Enable RLS
ALTER TABLE public.collaborator_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins can view all permissions"
ON public.collaborator_permissions
FOR SELECT
TO authenticated
USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert permissions"
ON public.collaborator_permissions
FOR INSERT
TO authenticated
WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can update permissions"
ON public.collaborator_permissions
FOR UPDATE
TO authenticated
USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete permissions"
ON public.collaborator_permissions
FOR DELETE
TO authenticated
USING (has_admin_role(auth.uid()));

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON public.collaborator_permissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create function to check specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_type TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins have all permissions
  SELECT CASE 
    WHEN has_admin_role(_user_id) THEN true
    WHEN NOT has_colaborador_role(_user_id) THEN false
    ELSE COALESCE(
      (SELECT can_access 
       FROM public.collaborator_permissions 
       WHERE user_id = _user_id 
         AND permission_type = _permission_type
       LIMIT 1),
      false
    )
  END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_collaborator_permissions_updated_at
BEFORE UPDATE ON public.collaborator_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster permission lookups
CREATE INDEX idx_collaborator_permissions_user_type 
ON public.collaborator_permissions(user_id, permission_type);

COMMENT ON TABLE public.collaborator_permissions IS 'Granular permissions for collaborators to access specific admin sections';
COMMENT ON COLUMN public.collaborator_permissions.permission_type IS 'Permission types: odu, rituais, changelog, tools, users, analytics, settings, restore';