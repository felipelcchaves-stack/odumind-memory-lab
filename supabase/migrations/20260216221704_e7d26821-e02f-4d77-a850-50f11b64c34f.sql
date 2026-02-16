
-- 1. Adicionar configuração de período de graça
INSERT INTO app_settings (key, value, category, is_public, description)
VALUES ('subscription_grace_period_days', '3', 'subscription', false, 'Dias de graça antes de expirar assinatura por falta de pagamento')
ON CONFLICT (key) DO NOTHING;

-- 2. Criar função para expirar assinaturas automaticamente
CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grace_days INTEGER;
  expired_count INTEGER;
BEGIN
  SELECT COALESCE((
    SELECT value::INTEGER 
    FROM app_settings 
    WHERE key = 'subscription_grace_period_days'
  ), 0) INTO grace_days;
  
  UPDATE subscriptions
  SET status = 'expired',
      plan_name = 'Gratuito',
      updated_at = NOW()
  WHERE status = 'active'
    AND current_period_end IS NOT NULL
    AND current_period_end < (NOW() - (grace_days || ' days')::INTERVAL)
    AND payment_gateway = 'guru';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
