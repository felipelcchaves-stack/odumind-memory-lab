-- Tabela de cupons de desconto
CREATE TABLE public.discount_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 20,
  max_uses INTEGER DEFAULT NULL, -- NULL = ilimitado
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NULL = sem expiração
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'exit_popup', -- origem do cupom
  email TEXT DEFAULT NULL, -- email associado (para cupons personalizados)
  stripe_coupon_id TEXT DEFAULT NULL, -- ID do cupom no Stripe (se aplicável)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de uso de cupons
CREATE TABLE public.coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
  user_id UUID DEFAULT NULL, -- pode ser NULL para usuários não logados
  email TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  order_value DECIMAL(10,2) DEFAULT NULL,
  discount_applied DECIMAL(10,2) DEFAULT NULL
);

-- Habilitar RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para discount_coupons
CREATE POLICY "Admins can manage coupons" 
ON public.discount_coupons 
FOR ALL 
USING (has_admin_role(auth.uid()));

CREATE POLICY "Anyone can validate coupons" 
ON public.discount_coupons 
FOR SELECT 
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Políticas para coupon_usage
CREATE POLICY "Admins can view all usage" 
ON public.coupon_usage 
FOR SELECT 
USING (has_admin_role(auth.uid()));

CREATE POLICY "Users can view their own usage" 
ON public.coupon_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert usage" 
ON public.coupon_usage 
FOR INSERT 
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_discount_coupons_updated_at
BEFORE UPDATE ON public.discount_coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_discount_coupons_code ON public.discount_coupons(code);
CREATE INDEX idx_discount_coupons_email ON public.discount_coupons(email);
CREATE INDEX idx_discount_coupons_source ON public.discount_coupons(source);
CREATE INDEX idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_email ON public.coupon_usage(email);