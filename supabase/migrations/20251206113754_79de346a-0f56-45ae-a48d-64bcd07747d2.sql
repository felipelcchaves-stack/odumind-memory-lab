-- Create table to cache generated audio files
CREATE TABLE public.odu_audio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  odu_id UUID NOT NULL REFERENCES public.odu(id) ON DELETE CASCADE,
  audio_type TEXT NOT NULL DEFAULT 'nome', -- 'nome', 'verso_resumido', 'completo'
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  voice_id TEXT DEFAULT 'Aria',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(odu_id, audio_type)
);

-- Enable RLS
ALTER TABLE public.odu_audio ENABLE ROW LEVEL SECURITY;

-- Everyone can view audio (public content)
CREATE POLICY "Anyone can view odu audio"
ON public.odu_audio
FOR SELECT
USING (true);

-- Only admins and collaborators can manage audio
CREATE POLICY "Admins and Colaboradores can insert odu audio"
ON public.odu_audio
FOR INSERT
WITH CHECK (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can update odu audio"
ON public.odu_audio
FOR UPDATE
USING (has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can delete odu audio"
ON public.odu_audio
FOR DELETE
USING (has_colaborador_role(auth.uid()));

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('odu-audio', 'odu-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio bucket
CREATE POLICY "Anyone can view odu audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'odu-audio');

CREATE POLICY "Admins and Colaboradores can upload odu audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'odu-audio' AND has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can update odu audio files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'odu-audio' AND has_colaborador_role(auth.uid()));

CREATE POLICY "Admins and Colaboradores can delete odu audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'odu-audio' AND has_colaborador_role(auth.uid()));

-- Add index for faster lookups
CREATE INDEX idx_odu_audio_odu_id ON public.odu_audio(odu_id);
CREATE INDEX idx_odu_audio_type ON public.odu_audio(audio_type);