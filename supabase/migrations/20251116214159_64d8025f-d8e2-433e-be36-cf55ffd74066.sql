-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create odu_history table for version control
CREATE TABLE public.odu_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  odu_id UUID NOT NULL REFERENCES public.odu(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  nome TEXT NOT NULL,
  texto_principal TEXT NOT NULL,
  verso TEXT,
  significado TEXT,
  exemplos_praticos TEXT,
  tags TEXT[],
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_description TEXT
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odu_history ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_admin_role(auth.uid()));

-- Policies for odu (admin write access)
CREATE POLICY "Admins can insert odu"
ON public.odu
FOR INSERT
WITH CHECK (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can update odu"
ON public.odu
FOR UPDATE
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete odu"
ON public.odu
FOR DELETE
USING (public.has_admin_role(auth.uid()));

-- Policies for odu_history
CREATE POLICY "Admins can view odu history"
ON public.odu_history
FOR SELECT
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert odu history"
ON public.odu_history
FOR INSERT
WITH CHECK (public.has_admin_role(auth.uid()));

-- Function to save odu history before update
CREATE OR REPLACE FUNCTION public.save_odu_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Save old version to history
  INSERT INTO public.odu_history (
    odu_id, numero, nome, texto_principal, verso, significado, 
    exemplos_praticos, tags, edited_by
  )
  VALUES (
    OLD.id, OLD.numero, OLD.nome, OLD.texto_principal, OLD.verso, 
    OLD.significado, OLD.exemplos_praticos, OLD.tags, auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to save history on odu update
CREATE TRIGGER save_odu_history_trigger
BEFORE UPDATE ON public.odu
FOR EACH ROW
EXECUTE FUNCTION public.save_odu_history();