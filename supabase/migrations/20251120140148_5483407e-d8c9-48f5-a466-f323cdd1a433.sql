-- ============================================
-- SISTEMA DE SESSÃO ÚNICA
-- ============================================

-- Tabela para gerenciar sessões ativas (apenas 1 por usuário)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  session_id text NOT NULL,
  device_info jsonb,
  ip_address text,
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para active_sessions
CREATE POLICY "Users can view their own session"
  ON public.active_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session"
  ON public.active_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session"
  ON public.active_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session"
  ON public.active_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Função para limpar sessões expiradas (mais de 7 dias inativas)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.active_sessions
  WHERE last_activity < NOW() - INTERVAL '7 days';
END;
$$;

-- ============================================
-- SISTEMA DE PLANO FAMÍLIA
-- ============================================

-- Tabela de grupos familiares
CREATE TABLE IF NOT EXISTS public.family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  stripe_subscription_id text,
  group_name text DEFAULT 'Minha Família',
  max_members integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de membros de grupos familiares
CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  joined_at timestamp with time zone,
  UNIQUE(family_group_id, user_id)
);

-- Tabela de convites familiares
CREATE TABLE IF NOT EXISTS public.family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  expires_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas de família
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCTIONS DE SEGURANÇA
-- ============================================

-- Função para verificar se usuário é owner do grupo
CREATE OR REPLACE FUNCTION public.is_family_owner(_user_id uuid, _family_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_groups
    WHERE id = _family_group_id
      AND owner_user_id = _user_id
  )
$$;

-- Função para verificar se usuário é membro do grupo
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id uuid, _family_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_group_id = _family_group_id
      AND user_id = _user_id
      AND status = 'active'
  )
$$;

-- Função para obter grupo familiar do usuário
CREATE OR REPLACE FUNCTION public.get_user_family_group(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_group_id
  FROM public.family_members
  WHERE user_id = _user_id
    AND status = 'active'
  LIMIT 1
$$;

-- ============================================
-- RLS POLICIES - FAMILY GROUPS
-- ============================================

CREATE POLICY "Users can view their own family group"
  ON public.family_groups
  FOR SELECT
  USING (
    auth.uid() = owner_user_id 
    OR public.is_family_member(auth.uid(), id)
  );

CREATE POLICY "Users can create their own family group"
  ON public.family_groups
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update their family group"
  ON public.family_groups
  FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can delete their family group"
  ON public.family_groups
  FOR DELETE
  USING (auth.uid() = owner_user_id);

-- ============================================
-- RLS POLICIES - FAMILY MEMBERS
-- ============================================

CREATE POLICY "Members can view their family members"
  ON public.family_members
  FOR SELECT
  USING (public.is_family_member(auth.uid(), family_group_id));

CREATE POLICY "Owners can insert family members"
  ON public.family_members
  FOR INSERT
  WITH CHECK (
    public.is_family_owner(auth.uid(), family_group_id)
  );

CREATE POLICY "Owners can update family members"
  ON public.family_members
  FOR UPDATE
  USING (public.is_family_owner(auth.uid(), family_group_id));

CREATE POLICY "Owners can delete family members"
  ON public.family_members
  FOR DELETE
  USING (public.is_family_owner(auth.uid(), family_group_id));

-- ============================================
-- RLS POLICIES - FAMILY INVITES
-- ============================================

CREATE POLICY "Family members can view invites"
  ON public.family_invites
  FOR SELECT
  USING (
    public.is_family_member(auth.uid(), family_group_id)
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Owners can create invites"
  ON public.family_invites
  FOR INSERT
  WITH CHECK (public.is_family_owner(auth.uid(), family_group_id));

CREATE POLICY "Owners can update invites"
  ON public.family_invites
  FOR UPDATE
  USING (public.is_family_owner(auth.uid(), family_group_id));

CREATE POLICY "Owners can delete invites"
  ON public.family_invites
  FOR DELETE
  USING (public.is_family_owner(auth.uid(), family_group_id));

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para atualizar updated_at em family_groups
CREATE TRIGGER update_family_groups_updated_at
  BEFORE UPDATE ON public.family_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON public.active_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_group_id ON public.family_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_token ON public.family_invites(token);
CREATE INDEX IF NOT EXISTS idx_family_invites_email ON public.family_invites(email);