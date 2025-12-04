-- Create learning_phases table
CREATE TABLE public.learning_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  icone text NOT NULL,
  cor text NOT NULL,
  ordem integer NOT NULL,
  prerequisito_fase_id uuid REFERENCES public.learning_phases(id),
  prerequisito_percentual integer DEFAULT 100,
  odus_incluidos integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create user_phase_progress table
CREATE TABLE public.user_phase_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phase_id uuid REFERENCES public.learning_phases(id) NOT NULL,
  status text DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  certificate_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, phase_id)
);

-- Enable RLS
ALTER TABLE public.learning_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phase_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_phases (anyone can view)
CREATE POLICY "Anyone can view learning phases"
ON public.learning_phases FOR SELECT
USING (true);

CREATE POLICY "Admins can manage learning phases"
ON public.learning_phases FOR ALL
USING (has_admin_role(auth.uid()));

-- RLS policies for user_phase_progress
CREATE POLICY "Users can view their own phase progress"
ON public.user_phase_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phase progress"
ON public.user_phase_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phase progress"
ON public.user_phase_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_phase_progress_updated_at
BEFORE UPDATE ON public.user_phase_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed learning phases data
-- Phase 1: Oju Odu (16 Meji - números 1-16)
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, odus_incluidos)
VALUES ('oju-odu', 'Oju Odu - Fundamentos', 'Os 16 Odu principais (Meji) que formam a base de todo o sistema Ifá', 'Crown', 'amber', 1, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

-- Phase 2-17: Amulu Odu Families (each family has 16 Odu)
-- Family Ogbe: Odu 1 (Ejiogbe) + combinations 17-31
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-ogbe', 'Família Ogbe', 'Ejiogbe e suas 15 combinações', 'Flame', 'red', 2, id, 100, ARRAY[1,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]
FROM public.learning_phases WHERE slug = 'oju-odu';

-- Family Oyeku: Odu 2 + combinations 32-46
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-oyeku', 'Família Oyeku', 'Oyeku Meji e suas 15 combinações', 'Moon', 'slate', 3, id, 50, ARRAY[2,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46]
FROM public.learning_phases WHERE slug = 'familia-ogbe';

-- Family Iwori: Odu 3 + combinations 47-61
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-iwori', 'Família Iwori', 'Iwori Meji e suas 15 combinações', 'Droplets', 'blue', 4, id, 50, ARRAY[3,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61]
FROM public.learning_phases WHERE slug = 'familia-oyeku';

-- Family Odi: Odu 4 + combinations 62-76
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-odi', 'Família Odi', 'Odi Meji e suas 15 combinações', 'Mountain', 'stone', 5, id, 50, ARRAY[4,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76]
FROM public.learning_phases WHERE slug = 'familia-iwori';

-- Family Irosun: Odu 5 + combinations 77-91
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-irosun', 'Família Irosun', 'Irosun Meji e suas 15 combinações', 'Sun', 'yellow', 6, id, 50, ARRAY[5,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91]
FROM public.learning_phases WHERE slug = 'familia-odi';

-- Family Owonrin: Odu 6 + combinations 92-106
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-owonrin', 'Família Owonrin', 'Owonrin Meji e suas 15 combinações', 'Wind', 'cyan', 7, id, 50, ARRAY[6,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106]
FROM public.learning_phases WHERE slug = 'familia-irosun';

-- Family Obara: Odu 7 + combinations 107-121
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-obara', 'Família Obara', 'Obara Meji e suas 15 combinações', 'Sparkles', 'orange', 8, id, 50, ARRAY[7,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121]
FROM public.learning_phases WHERE slug = 'familia-owonrin';

-- Family Okanran: Odu 8 + combinations 122-136
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-okanran', 'Família Okanran', 'Okanran Meji e suas 15 combinações', 'Heart', 'rose', 9, id, 50, ARRAY[8,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136]
FROM public.learning_phases WHERE slug = 'familia-obara';

-- Family Ogunda: Odu 9 + combinations 137-151
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-ogunda', 'Família Ogunda', 'Ogunda Meji e suas 15 combinações', 'Sword', 'zinc', 10, id, 50, ARRAY[9,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151]
FROM public.learning_phases WHERE slug = 'familia-okanran';

-- Family Osa: Odu 10 + combinations 152-166
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-osa', 'Família Osa', 'Osa Meji e suas 15 combinações', 'CloudLightning', 'violet', 11, id, 50, ARRAY[10,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166]
FROM public.learning_phases WHERE slug = 'familia-ogunda';

-- Family Ika: Odu 11 + combinations 167-181
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-ika', 'Família Ika', 'Ika Meji e suas 15 combinações', 'Shield', 'emerald', 12, id, 50, ARRAY[11,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181]
FROM public.learning_phases WHERE slug = 'familia-osa';

-- Family Oturupon: Odu 12 + combinations 182-196
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-oturupon', 'Família Oturupon', 'Oturupon Meji e suas 15 combinações', 'Leaf', 'lime', 13, id, 50, ARRAY[12,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196]
FROM public.learning_phases WHERE slug = 'familia-ika';

-- Family Otura: Odu 13 + combinations 197-211
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-otura', 'Família Otura', 'Otura Meji e suas 15 combinações', 'Star', 'sky', 14, id, 50, ARRAY[13,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211]
FROM public.learning_phases WHERE slug = 'familia-oturupon';

-- Family Irete: Odu 14 + combinations 212-226
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-irete', 'Família Irete', 'Irete Meji e suas 15 combinações', 'TreeDeciduous', 'green', 15, id, 50, ARRAY[14,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226]
FROM public.learning_phases WHERE slug = 'familia-otura';

-- Family Ose: Odu 15 + combinations 227-241
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-ose', 'Família Ose', 'Ose Meji e suas 15 combinações', 'Waves', 'teal', 16, id, 50, ARRAY[15,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241]
FROM public.learning_phases WHERE slug = 'familia-irete';

-- Family Ofun: Odu 16 + combinations 242-256
INSERT INTO public.learning_phases (slug, nome, descricao, icone, cor, ordem, prerequisito_fase_id, prerequisito_percentual, odus_incluidos)
SELECT 'familia-ofun', 'Família Ofun', 'Ofun Meji e suas 15 combinações', 'Circle', 'fuchsia', 17, id, 50, ARRAY[16,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256]
FROM public.learning_phases WHERE slug = 'familia-ose';