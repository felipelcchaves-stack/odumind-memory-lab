-- Create table to track renewal offers
CREATE TABLE public.renewal_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    coupon_id UUID REFERENCES public.discount_coupons(id),
    offer_type TEXT NOT NULL DEFAULT 'renewal', -- 'renewal', 'win_back', 'upgrade'
    discount_percent INTEGER NOT NULL DEFAULT 15,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'opened', 'used', 'expired'
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    plan_name TEXT,
    original_value DECIMAL(10,2),
    email_sent_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.renewal_offers ENABLE ROW LEVEL SECURITY;

-- Admin can view all offers
CREATE POLICY "Admins can manage all renewal offers"
ON public.renewal_offers
FOR ALL
USING (has_admin_role(auth.uid()));

-- Users can view their own offers
CREATE POLICY "Users can view their own renewal offers"
ON public.renewal_offers
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_renewal_offers_user_id ON public.renewal_offers(user_id);
CREATE INDEX idx_renewal_offers_status ON public.renewal_offers(status);

-- Add trigger for updated_at
CREATE TRIGGER update_renewal_offers_updated_at
BEFORE UPDATE ON public.renewal_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();