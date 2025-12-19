-- Criar tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_original DECIMAL(10,2), -- para mostrar desconto
  moeda TEXT NOT NULL DEFAULT 'BRL',
  periodo TEXT NOT NULL DEFAULT 'mensal', -- mensal, trimestral, semestral, anual, unico
  duracao_dias INTEGER, -- null = recorrente, número = acesso por X dias
  features JSONB NOT NULL DEFAULT '[]'::jsonb, -- array de {text: string, included: boolean}
  checkout_url TEXT, -- URL do checkout GURU
  guru_product_id TEXT, -- ID do produto no GURU
  guru_offer_id TEXT, -- ID da oferta no GURU
  plan_level TEXT NOT NULL DEFAULT 'gratuito', -- gratuito, awo, egbe (para permissões)
  hierarquia INTEGER NOT NULL DEFAULT 0, -- 0=free, 1=awo, 2=egbe (para upgrades)
  cta_text TEXT NOT NULL DEFAULT 'Assinar',
  badge_text TEXT, -- "Mais Popular", "Melhor Valor", etc
  variant TEXT NOT NULL DEFAULT 'default', -- outline, default, premium
  cor TEXT, -- cor do card/badge
  ativo BOOLEAN NOT NULL DEFAULT true,
  visivel_landing BOOLEAN NOT NULL DEFAULT true,
  visivel_subscription BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices
CREATE INDEX idx_subscription_plans_slug ON public.subscription_plans(slug);
CREATE INDEX idx_subscription_plans_ativo ON public.subscription_plans(ativo);
CREATE INDEX idx_subscription_plans_plan_level ON public.subscription_plans(plan_level);
CREATE INDEX idx_subscription_plans_guru_product_id ON public.subscription_plans(guru_product_id);

-- Habilitar RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (ativo = true OR has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert plans"
ON public.subscription_plans
FOR INSERT
WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can update plans"
ON public.subscription_plans
FOR UPDATE
USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete plans"
ON public.subscription_plans
FOR DELETE
USING (has_admin_role(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir planos iniciais baseados nos dados atuais
INSERT INTO public.subscription_plans (slug, nome, descricao, preco, periodo, features, plan_level, hierarquia, cta_text, variant, ordem, visivel_landing, visivel_subscription) VALUES
('gratuito', 'Gratuito', 'Para conhecer o método', 0, 'mensal', 
 '[{"text": "Acesso a 5 Odu", "included": true}, {"text": "Flashcards básicos", "included": true}, {"text": "Progresso limitado", "included": true}, {"text": "Sem acesso aos rituais", "included": false}, {"text": "Sem suporte prioritário", "included": false}]'::jsonb,
 'gratuito', 0, 'Começar Grátis', 'outline', 0, true, true);

INSERT INTO public.subscription_plans (slug, nome, descricao, preco, periodo, features, checkout_url, guru_offer_id, plan_level, hierarquia, cta_text, badge_text, variant, ordem, visivel_landing, visivel_subscription) VALUES
('awo-mensal', 'Awo', 'Para estudantes dedicados', 97.00, 'mensal',
 '[{"text": "Acesso a todos os 256 Odu", "included": true}, {"text": "Flashcards ilimitados", "included": true}, {"text": "Spaced repetition avançado", "included": true}, {"text": "Progresso detalhado", "included": true}, {"text": "Acesso aos rituais", "included": true}]'::jsonb,
 NULL, 'awo-mensal', 'awo', 1, 'Assinar Awo', 'Mais Popular', 'default', 1, true, true);

INSERT INTO public.subscription_plans (slug, nome, descricao, preco, periodo, features, checkout_url, guru_offer_id, plan_level, hierarquia, cta_text, variant, ordem, visivel_landing, visivel_subscription) VALUES
('egbe-mensal', 'Egbe', 'Para sacerdotes e mestres', 129.90, 'mensal',
 '[{"text": "Tudo do plano Awo", "included": true}, {"text": "Conteúdo exclusivo avançado", "included": true}, {"text": "Mentoria em grupo", "included": true}, {"text": "Suporte prioritário", "included": true}, {"text": "Certificados de conclusão", "included": true}]'::jsonb,
 NULL, 'egbe-mensal', 'egbe', 2, 'Assinar Egbe', 'premium', 2, true, true);