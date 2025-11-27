-- Remover políticas RESTRICTIVE existentes
DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON app_settings;

-- Criar novas políticas PERMISSIVE para admins
CREATE POLICY "Admins can update settings" 
ON app_settings
FOR UPDATE
TO authenticated
USING (has_admin_role(auth.uid()))
WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert settings" 
ON app_settings
FOR INSERT
TO authenticated
WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete settings" 
ON app_settings
FOR DELETE
TO authenticated
USING (has_admin_role(auth.uid()));