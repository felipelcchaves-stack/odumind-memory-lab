-- Create table for Odu content
CREATE TABLE public.odu (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  texto_principal TEXT NOT NULL,
  verso TEXT,
  significado TEXT,
  exemplos_praticos TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.odu ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view Odu (public content)
CREATE POLICY "Anyone can view Odu"
ON public.odu
FOR SELECT
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_odu_updated_at
BEFORE UPDATE ON public.odu
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample Odu data (first 5 for testing)
INSERT INTO public.odu (numero, nome, texto_principal, verso, significado, exemplos_praticos, tags) VALUES
(1, 'Eji Ogbe', 'Primeiro dos 256 Odu, representa o início, a luz, o caminho aberto.', 'Onde há luz, não há escuridão. O caminho de Eji Ogbe é sempre claro.', 'Representa clareza, autoridade, início de novos ciclos e liderança.', 'Usar em rituais de abertura de caminhos e novos empreendimentos.', ARRAY['início', 'luz', 'liderança', 'clareza']),
(2, 'Oyeku Meji', 'Odu que representa os mistérios, a noite, os ancestrais.', 'Na escuridão, os ancestrais falam. Oyeku Meji nos conecta com o invisível.', 'Mistério, conexão ancestral, transformação através da escuridão.', 'Rituais de conexão com ancestrais e trabalhos espirituais noturnos.', ARRAY['mistério', 'ancestrais', 'noite', 'transformação']),
(3, 'Iwori Meji', 'Odu da confusão e conflito, mas também da resolução.', 'No caos, encontramos ordem. Iwori ensina através do desafio.', 'Conflito, desafio, aprendizado através da adversidade.', 'Preparação para enfrentar obstáculos e resolver disputas.', ARRAY['conflito', 'desafio', 'resolução', 'aprendizado']),
(4, 'Odi Meji', 'Odu da gestação, fertilidade e criação.', 'Como a semente na terra, Odi Meji traz vida nova.', 'Fertilidade, gestação de ideias, criação, paciência.', 'Rituais de fertilidade e início de projetos criativos.', ARRAY['fertilidade', 'criação', 'gestação', 'paciência']),
(5, 'Irosun Meji', 'Odu dos sonhos, intuição e visões.', 'Irosun fala através dos sonhos. Ouça o que a noite revela.', 'Intuição, sonhos proféticos, mensagens espirituais.', 'Trabalhos de desenvolvimento da intuição e interpretação de sonhos.', ARRAY['sonhos', 'intuição', 'visões', 'profecias']);