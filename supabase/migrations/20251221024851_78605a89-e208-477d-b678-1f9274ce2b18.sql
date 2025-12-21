-- Adicionar campos para tracking de valores reais pagos (descontos e cupons)
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_applied NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;