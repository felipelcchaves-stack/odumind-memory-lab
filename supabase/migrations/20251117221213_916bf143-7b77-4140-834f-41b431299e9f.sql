-- Add last_viewed_changelog to profiles table
ALTER TABLE profiles 
ADD COLUMN last_viewed_changelog VARCHAR(20) DEFAULT NULL;

-- Create changelog table
CREATE TABLE changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL UNIQUE,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  titulo TEXT NOT NULL,
  items JSONB NOT NULL,
  destaque BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for changelog
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;

-- Anyone can view changelog
CREATE POLICY "Anyone can view changelog" 
ON changelog 
FOR SELECT 
USING (true);

-- Only admins can manage changelog
CREATE POLICY "Admins can insert changelog" 
ON changelog 
FOR INSERT 
WITH CHECK (has_admin_role(auth.uid()));

CREATE POLICY "Admins can update changelog" 
ON changelog 
FOR UPDATE 
USING (has_admin_role(auth.uid()));

CREATE POLICY "Admins can delete changelog" 
ON changelog 
FOR DELETE 
USING (has_admin_role(auth.uid()));

-- Insert first changelog entry with recent improvements
INSERT INTO changelog (version, titulo, release_date, destaque, items)
VALUES (
  'v1.2.0',
  '🎉 Melhorias no Sistema de Memorização',
  '2024-11-17',
  true,
  '[
    {
      "tipo": "novo",
      "titulo": "Sistema de Flashcards Aleatórios",
      "descricao": "Os cards agora aparecem em ordem aleatória para maximizar a retenção através do efeito de surpresa e active recall.",
      "icone": "🎴"
    },
    {
      "tipo": "melhoria",
      "titulo": "Sessão de Estudo Contínua",
      "descricao": "Estude quantos Odu quiser! Removemos o limite de 10 cards por sessão. Você decide quando parar.",
      "icone": "♾️"
    },
    {
      "tipo": "melhoria",
      "titulo": "Botão Encerrar Sessão",
      "descricao": "Novo botão para encerrar sua sessão quando quiser, com resumo detalhado do seu desempenho.",
      "icone": "✋"
    },
    {
      "tipo": "melhoria",
      "titulo": "Contador de Cards Estudados",
      "descricao": "Acompanhe em tempo real quantos cards você já revisou na sessão atual.",
      "icone": "📊"
    }
  ]'::jsonb
);