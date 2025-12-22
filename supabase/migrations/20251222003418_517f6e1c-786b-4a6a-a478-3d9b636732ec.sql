-- RLS policies for admin/collaborator access to family groups

-- Allow admins and collaborators to view all family groups
CREATE POLICY "Admins and Colaboradores can view all family groups" 
ON public.family_groups 
FOR SELECT 
USING (has_colaborador_role(auth.uid()));

-- Allow admins and collaborators to view all family members
CREATE POLICY "Admins and Colaboradores can view all family members" 
ON public.family_members 
FOR SELECT 
USING (has_colaborador_role(auth.uid()));

-- Allow admins and collaborators to update family members (for removing members)
CREATE POLICY "Admins and Colaboradores can update family members" 
ON public.family_members 
FOR UPDATE 
USING (has_colaborador_role(auth.uid()));