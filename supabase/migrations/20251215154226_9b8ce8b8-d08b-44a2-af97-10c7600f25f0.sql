-- Tabela de anúncios controlados pelo admin
CREATE TABLE public.admin_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'novidade', 'alerta', 'promocao')),
  ativo boolean NOT NULL DEFAULT false,
  show_to text NOT NULL DEFAULT 'todos' CHECK (show_to IN ('todos', 'free', 'premium', 'admins')),
  created_by uuid REFERENCES public.profiles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de anúncios lidos pelos usuários
CREATE TABLE public.user_announcements_read (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.admin_announcements(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_announcements_read ENABLE ROW LEVEL SECURITY;

-- Policies for admin_announcements
CREATE POLICY "Anyone can view active announcements"
  ON public.admin_announcements
  FOR SELECT
  USING (ativo = true OR has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert announcements"
  ON public.admin_announcements
  FOR INSERT
  WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can update announcements"
  ON public.admin_announcements
  FOR UPDATE
  USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete announcements"
  ON public.admin_announcements
  FOR DELETE
  USING (has_admin_role(auth.uid()));

-- Policies for user_announcements_read
CREATE POLICY "Users can view their own read announcements"
  ON public.user_announcements_read
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read announcements"
  ON public.user_announcements_read
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_admin_announcements_updated_at
  BEFORE UPDATE ON public.admin_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();