-- Tabela de avaliações dos usuários
CREATE TABLE public.user_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_approved boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  xp_at_review integer NOT NULL DEFAULT 0,
  display_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver sua própria avaliação
CREATE POLICY "Users can view their own review"
ON public.user_reviews
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem criar sua avaliação
CREATE POLICY "Users can create their own review"
ON public.user_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar sua própria avaliação
CREATE POLICY "Users can update their own review"
ON public.user_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Público pode ver avaliações aprovadas com 5 estrelas
CREATE POLICY "Anyone can view approved 5-star reviews"
ON public.user_reviews
FOR SELECT
USING (is_approved = true AND rating = 5);

-- Admins podem ver todas as avaliações
CREATE POLICY "Admins can view all reviews"
ON public.user_reviews
FOR SELECT
USING (has_admin_role(auth.uid()));

-- Admins podem atualizar qualquer avaliação
CREATE POLICY "Admins can update any review"
ON public.user_reviews
FOR UPDATE
USING (has_admin_role(auth.uid()));

-- Admins podem deletar avaliações
CREATE POLICY "Admins can delete reviews"
ON public.user_reviews
FOR DELETE
USING (has_admin_role(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_user_reviews_updated_at
BEFORE UPDATE ON public.user_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar configurações do sistema de reviews
INSERT INTO public.app_settings (key, value, category, description, is_public)
VALUES 
  ('review_min_xp', '500', 'reviews', 'XP mínimo necessário para avaliar', true),
  ('review_min_count_to_show', '100', 'reviews', 'Quantidade mínima de avaliações para exibir na landing', true),
  ('review_show_on_landing', 'true', 'reviews', 'Exibir avaliações na landing page', true)
ON CONFLICT (key) DO NOTHING;