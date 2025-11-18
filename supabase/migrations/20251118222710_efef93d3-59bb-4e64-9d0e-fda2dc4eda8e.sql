-- Fase 5: Adicionar campos narrativos aos Odus
ALTER TABLE odu
ADD COLUMN IF NOT EXISTS contexto_historico TEXT,
ADD COLUMN IF NOT EXISTS personagens TEXT,
ADD COLUMN IF NOT EXISTS tema_principal TEXT,
ADD COLUMN IF NOT EXISTS tema_secundario TEXT;

-- Criar tabela de tags narrativas
CREATE TABLE IF NOT EXISTS narrative_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  odu_id UUID REFERENCES odu(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  tipo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE narrative_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view narrative tags"
  ON narrative_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins and Colaboradores can insert narrative tags"
  ON narrative_tags FOR INSERT
  WITH CHECK (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can update narrative tags"
  ON narrative_tags FOR UPDATE
  USING (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can delete narrative tags"
  ON narrative_tags FOR DELETE
  USING (has_colaborador_role(auth.uid()));