-- Fase 1: Criar tabela de auditoria de mudanças de assinatura
CREATE TABLE IF NOT EXISTS public.subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_plan TEXT NOT NULL,
  new_plan TEXT NOT NULL,
  old_stripe_subscription_id TEXT,
  new_stripe_subscription_id TEXT,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  reason TEXT,
  stripe_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_subscription_changes_user_id ON public.subscription_changes(user_id);
CREATE INDEX idx_subscription_changes_changed_by ON public.subscription_changes(changed_by);
CREATE INDEX idx_subscription_changes_created_at ON public.subscription_changes(created_at DESC);

-- RLS Policies
ALTER TABLE public.subscription_changes ENABLE ROW LEVEL SECURITY;

-- Admins podem inserir registros de auditoria
CREATE POLICY "Admins can insert subscription changes"
  ON public.subscription_changes
  FOR INSERT
  TO authenticated
  WITH CHECK (has_admin_role(auth.uid()));

-- Admins podem visualizar todo o histórico
CREATE POLICY "Admins can view all subscription changes"
  ON public.subscription_changes
  FOR SELECT
  TO authenticated
  USING (has_admin_role(auth.uid()));

-- Usuários podem ver apenas suas próprias mudanças
CREATE POLICY "Users can view their own subscription changes"
  ON public.subscription_changes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE public.subscription_changes IS 'Auditoria de mudanças de assinaturas feitas por administradores';
COMMENT ON COLUMN public.subscription_changes.user_id IS 'Usuário cuja assinatura foi alterada';
COMMENT ON COLUMN public.subscription_changes.changed_by IS 'Admin que realizou a mudança';
COMMENT ON COLUMN public.subscription_changes.billing_cycle IS 'Ciclo de cobrança: monthly ou annual';
COMMENT ON COLUMN public.subscription_changes.stripe_response IS 'Resposta completa da API do Stripe';