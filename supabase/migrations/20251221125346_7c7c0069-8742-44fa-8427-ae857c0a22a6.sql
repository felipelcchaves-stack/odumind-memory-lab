-- Tabela para armazenar snapshots financeiros sincronizados da Pagar.me
CREATE TABLE public.financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_month TEXT NOT NULL,
  gross_revenue DECIMAL(12,2) DEFAULT 0,
  gateway_fees DECIMAL(12,2) DEFAULT 0,
  sales_commission DECIMAL(12,2) DEFAULT 0,
  net_revenue DECIMAL(12,2) DEFAULT 0,
  transaction_count INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'pagarme',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_month_source UNIQUE (reference_month, source)
);

-- Enable RLS
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;

-- Only admins can manage financial snapshots
CREATE POLICY "Admins can view financial snapshots"
ON public.financial_snapshots
FOR SELECT
USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert financial snapshots"
ON public.financial_snapshots
FOR INSERT
WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can update financial snapshots"
ON public.financial_snapshots
FOR UPDATE
USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete financial snapshots"
ON public.financial_snapshots
FOR DELETE
USING (has_admin_role(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_financial_snapshots_updated_at
BEFORE UPDATE ON public.financial_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();