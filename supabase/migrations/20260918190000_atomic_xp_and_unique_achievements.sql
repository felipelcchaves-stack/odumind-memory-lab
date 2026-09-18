-- Item 15: profiles.xp era lido no cliente, somado em JS e escrito de volta -
-- um update concorrente (duplo clique, duas abas) podia sobrescrever o outro
-- e perder XP. Increment atômico via function no banco.
CREATE OR REPLACE FUNCTION public.increment_user_xp(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + _amount
  WHERE user_id = _user_id;
END;
$$;

-- Item 16: check_and_award_achievements só evitava duplicidade com um
-- NOT EXISTS dentro da function (não atômico) - duas chamadas concorrentes
-- (ex: Dashboard.tsx chamava a mesma RPC duas vezes por carregamento) podiam
-- passar o NOT EXISTS antes de qualquer uma commitar o INSERT, gerando linhas
-- duplicadas e inflando o contador de conquistas mostrado ao aluno.
ALTER TABLE public.conquistas
  ADD CONSTRAINT conquistas_user_tipo_unique UNIQUE (user_id, tipo);
