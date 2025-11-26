-- Adicionar campos GURU na tabela subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS guru_subscription_id text,
ADD COLUMN IF NOT EXISTS guru_customer_id text,
ADD COLUMN IF NOT EXISTS payment_gateway text DEFAULT 'stripe';

-- Criar índice para busca por guru_subscription_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_guru_subscription_id 
ON public.subscriptions(guru_subscription_id) 
WHERE guru_subscription_id IS NOT NULL;

-- Criar índice para busca por guru_customer_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_guru_customer_id 
ON public.subscriptions(guru_customer_id) 
WHERE guru_customer_id IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.subscriptions.guru_subscription_id IS 'ID da assinatura na plataforma GURU';
COMMENT ON COLUMN public.subscriptions.guru_customer_id IS 'ID do cliente na plataforma GURU';
COMMENT ON COLUMN public.subscriptions.payment_gateway IS 'Gateway de pagamento utilizado: stripe ou guru';