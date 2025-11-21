import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Music, Upload, Trash2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface AudioUploaderProps {
  onUploadComplete: (audioUrl: string) => void;
  currentAudioUrl?: string;
}

export default function AudioUploader({ onUploadComplete, currentAudioUrl }: AudioUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast.error('Por favor, selecione um arquivo de áudio válido');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB');
        return;
      }

      setAudioFile(file);
    }
  };

  const uploadAudio = async () => {
    if (!audioFile) {
      toast.error('Selecione um arquivo de áudio');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `audio/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('odu-images') // Reusing existing bucket
        .upload(filePath, audioFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('odu-images')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      toast.success('Áudio carregado com sucesso!');
      onUploadComplete(publicUrl);
      setAudioFile(null);
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      toast.error(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteAudio = async () => {
    if (!currentAudioUrl) return;

    if (!confirm('Tem certeza que deseja excluir este áudio?')) return;

    try {
      // Extract file path from URL
      const urlParts = currentAudioUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('audio')).join('/');

      const { error } = await supabase.storage
        .from('odu-images')
        .remove([filePath]);

      if (error) throw error;

      toast.success('Áudio excluído com sucesso');
      onUploadComplete('');
    } catch (error: any) {
      console.error('Error deleting audio:', error);
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  const togglePlayPause = () => {
    if (!currentAudioUrl) return;

    if (!audioElement) {
      const audio = new Audio(currentAudioUrl);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {currentAudioUrl ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Áudio atual</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={deleteAudio}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <audio controls className="w-full">
            <source src={currentAudioUrl} />
            Seu navegador não suporta o elemento de áudio.
          </audio>
        </div>
      ) : (
        <div className="space-y-3">
          <Label htmlFor="audio-upload">Upload de Áudio (MP3, WAV, etc.)</Label>
          <Input
            id="audio-upload"
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          
          {audioFile && (
            <div className="text-sm text-muted-foreground">
              Arquivo selecionado: {audioFile.name}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Fazendo upload... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            type="button"
            onClick={uploadAudio}
            disabled={!audioFile || uploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Fazendo Upload...' : 'Upload de Áudio'}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Formatos suportados: MP3, WAV, OGG. Tamanho máximo: 10MB
      </p>
    </div>
  );
}
