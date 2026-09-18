-- Item 19: FamilyMemberProgress.tsx lê profiles/memorizacao de outros
-- membros do grupo Família diretamente, mas a única policy de SELECT em
-- profiles era "própria linha" ou admin - um membro comum via a seção de
-- progresso da família sempre vazia (RLS filtrava tudo silenciosamente,
-- sem erro). Isso libera leitura pra quem realmente compartilha um grupo
-- familiar ativo com o dono da linha.
CREATE OR REPLACE FUNCTION public.shares_family_group(_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm1
    JOIN public.family_members fm2 ON fm2.family_group_id = fm1.family_group_id
    WHERE fm1.user_id = _user_id
      AND fm1.status = 'active'
      AND fm2.user_id = _target_user_id
      AND fm2.status = 'active'
  )
$$;

CREATE POLICY "Family members can view group members profiles"
  ON public.profiles FOR SELECT
  USING (public.shares_family_group(auth.uid(), user_id));

CREATE POLICY "Family members can view group members memorizacao"
  ON public.memorizacao FOR SELECT
  USING (public.shares_family_group(auth.uid(), user_id));
