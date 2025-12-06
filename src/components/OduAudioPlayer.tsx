import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OduAudioPlayerProps {
  oduId: string;
  audioType?: 'nome' | 'verso_resumido' | 'completo';
  className?: string;
  variant?: 'icon' | 'button';
  label?: string;
}

export const OduAudioPlayer = ({
  oduId,
  audioType = 'nome',
  className = '',
  variant = 'icon',
  label,
}: OduAudioPlayerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fetchOrGenerateAudio = async () => {
    if (audioUrl) return audioUrl;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-odu-audio', {
        body: { odu_id: oduId, audio_type: audioType },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.audio_url) {
        setAudioUrl(data.audio_url);
        return data.audio_url;
      }

      throw new Error('No audio URL returned');
    } catch (error) {
      console.error('Error fetching audio:', error);
      toast.error('Erro ao gerar áudio. Tente novamente.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (isLoading) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    const url = await fetchOrGenerateAudio();
    if (!url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        toast.error('Erro ao reproduzir áudio');
        setIsPlaying(false);
      };
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Erro ao reproduzir áudio');
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={`inline-flex items-center justify-center p-1.5 rounded-full hover:bg-primary/10 transition-colors disabled:opacity-50 ${className}`}
        title={isPlaying ? 'Pausar' : 'Ouvir pronúncia'}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : isPlaying ? (
          <VolumeX className="h-4 w-4 text-primary" />
        ) : (
          <Volume2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
        )}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlay}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando...
          </>
        ) : isPlaying ? (
          <>
            <Pause className="h-4 w-4" />
            Pausar
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            {label || 'Ouvir'}
          </>
        )}
      </Button>
      
      {(isPlaying || audioUrl) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={cyclePlaybackRate}
          className="text-xs px-2"
        >
          {playbackRate}x
        </Button>
      )}
    </div>
  );
};
