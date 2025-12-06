import { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SyncedTextHighlighterProps {
  text: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  className?: string;
}

interface TextSegment {
  text: string;
  startTime: number;
  endTime: number;
}

export const SyncedTextHighlighter = ({
  text,
  isPlaying,
  currentTime,
  duration,
  className = '',
}: SyncedTextHighlighterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLSpanElement>(null);

  // Split text into segments by sentences/phrases
  const segments: TextSegment[] = useMemo(() => {
    if (!text || duration <= 0) return [];

    // Split by sentence-ending punctuation, keeping the punctuation
    const parts = text.split(/(?<=[.!?;:,])\s+/);
    
    // If no splits, treat as single segment
    if (parts.length === 0) {
      return [{ text, startTime: 0, endTime: duration }];
    }

    // Calculate total character count for proportional timing
    const totalChars = parts.reduce((sum, part) => sum + part.length, 0);
    
    let currentStartTime = 0;
    
    return parts.map((part) => {
      // Proportional duration based on character count
      const proportion = part.length / totalChars;
      const segmentDuration = duration * proportion;
      
      const segment: TextSegment = {
        text: part,
        startTime: currentStartTime,
        endTime: currentStartTime + segmentDuration,
      };
      
      currentStartTime += segmentDuration;
      return segment;
    });
  }, [text, duration]);

  // Find current segment index
  const currentSegmentIndex = useMemo(() => {
    if (!isPlaying && currentTime === 0) return -1;
    
    for (let i = 0; i < segments.length; i++) {
      if (currentTime >= segments[i].startTime && currentTime < segments[i].endTime) {
        return i;
      }
    }
    
    // If past all segments, highlight last one
    if (currentTime >= duration && segments.length > 0) {
      return segments.length - 1;
    }
    
    return -1;
  }, [currentTime, segments, isPlaying, duration]);

  // Auto-scroll to keep active segment visible
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSegmentIndex]);

  if (!text) return null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <p className="text-lg leading-relaxed">
        {segments.map((segment, index) => {
          const isPast = index < currentSegmentIndex;
          const isCurrent = index === currentSegmentIndex;
          const isFuture = index > currentSegmentIndex;

          return (
            <motion.span
              key={index}
              ref={isCurrent ? activeSegmentRef : null}
              initial={false}
              animate={{
                opacity: isFuture ? 0.5 : 1,
                scale: isCurrent ? 1.02 : 1,
              }}
              transition={{ duration: 0.2 }}
              className={`
                inline transition-all duration-300 ease-out
                ${isCurrent 
                  ? 'bg-primary/25 text-primary font-medium px-1 py-0.5 rounded' 
                  : ''
                }
                ${isPast 
                  ? 'text-muted-foreground' 
                  : ''
                }
                ${isFuture 
                  ? 'text-foreground/50' 
                  : ''
                }
              `}
            >
              {segment.text}
              {index < segments.length - 1 ? ' ' : ''}
            </motion.span>
          );
        })}
      </p>

      {/* Progress indicator */}
      {isPlaying && duration > 0 && (
        <div className="mt-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentTime / duration) * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
