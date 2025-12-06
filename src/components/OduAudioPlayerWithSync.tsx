import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OduAudioPlayerWithSyncProps {
  oduId: string;
  audioType?: 'nome' | 'verso_resumido' | 'completo';
  className?: string;
  label?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export const OduAudioPlayerWithSync = ({
  oduId,
  audioType = 'nome',
  className = '',
  label,
  onTimeUpdate,
  onPlayingChange,
}: OduAudioPlayerWithSyncProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);

  // Notify parent of playing state changes
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  const startTimeTracking = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    // Update every 50ms for smooth highlighting
    timeUpdateIntervalRef.current = setInterval(() => {
      if (audioRef.current && onTimeUpdate) {
        onTimeUpdate(audioRef.current.currentTime, audioRef.current.duration || duration);
      }
    }, 50);
  }, [onTimeUpdate, duration]);

  const stopTimeTracking = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
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
      stopTimeTracking();
      return;
    }

    const url = await fetchOrGenerateAudio();
    if (!url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.playbackRate = playbackRate;
      
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
          onTimeUpdate?.(0, audioRef.current.duration);
        }
      };
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        stopTimeTracking();
        onTimeUpdate?.(duration, duration);
      };
      
      audioRef.current.onerror = () => {
        toast.error('Erro ao reproduzir áudio');
        setIsPlaying(false);
        stopTimeTracking();
      };
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      startTimeTracking();
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
