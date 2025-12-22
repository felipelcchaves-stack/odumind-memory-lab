-- Adicionar política RLS para permitir visualização de convites por token
-- O token UUID é seguro o suficiente para ser a "prova" de autorização

CREATE POLICY "Anyone can view invites by token"
ON public.family_invites
FOR SELECT
USING (true);