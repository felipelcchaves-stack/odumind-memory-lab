-- Parte 2: Criar funções e atualizar policies

-- Criar função para verificar se usuário é colaborador ou admin
CREATE OR REPLACE FUNCTION public.has_colaborador_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'colaborador')
  )
$$;

-- Criar função para verificar se usuário tem algum role válido
CREATE OR REPLACE FUNCTION public.has_aluno_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'colaborador', 'aluno')
  )
$$;

-- Atualizar policies da tabela odu para permitir colaboradores gerenciarem conteúdo
DROP POLICY IF EXISTS "Admins can insert odu" ON public.odu;
DROP POLICY IF EXISTS "Admins can update odu" ON public.odu;
DROP POLICY IF EXISTS "Admins can delete odu" ON public.odu;

CREATE POLICY "Admins and Colaboradores can insert odu" 
ON public.odu 
FOR INSERT 
WITH CHECK (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can update odu" 
ON public.odu 
FOR UPDATE 
USING (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can delete odu" 
ON public.odu 
FOR DELETE 
USING (has_colaborador_role(auth.uid()));

-- Atualizar policies da tabela odu_history
DROP POLICY IF EXISTS "Admins can insert odu history" ON public.odu_history;
DROP POLICY IF EXISTS "Admins can view odu history" ON public.odu_history;

CREATE POLICY "Admins and Colaboradores can insert odu history" 
ON public.odu_history 
FOR INSERT 
WITH CHECK (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can view odu history" 
ON public.odu_history 
FOR SELECT 
USING (has_colaborador_role(auth.uid()));

-- Atribuir role 'aluno' a todos os usuários que não têm nenhum role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'aluno'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
)
ON CONFLICT DO NOTHING;