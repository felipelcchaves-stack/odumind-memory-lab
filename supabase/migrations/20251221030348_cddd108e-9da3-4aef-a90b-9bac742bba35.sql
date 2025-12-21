-- Preencher amount_paid nas assinaturas existentes que estão nulas
-- Isso garante que o MRR seja calculado corretamente com dados históricos

UPDATE subscriptions s
SET amount_paid = sp.preco
FROM subscription_plans sp
WHERE s.plan_name = sp.nome
  AND s.amount_paid IS NULL
  AND sp.ativo = true
  AND s.status IN ('active', 'trialing');