-- Allow admins and collaborators to view all family invites
CREATE POLICY "Admins and Colaboradores can view all family invites" 
ON public.family_invites 
FOR SELECT 
USING (has_colaborador_role(auth.uid()));