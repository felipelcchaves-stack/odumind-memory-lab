import { useEffect, useState } from 'react';
import { MilestoneType } from '@/components/MilestoneCelebration';

interface MilestoneDetectionProps {
  currentRevisoes: number;
  currentStrength: number;
  status: string;
  onMilestone?: (milestone: MilestoneType) => void;
}

interface MilestoneState {
  milestone: MilestoneType | null;
  previousRevisoes: number;
  previousStrength: number;
  hasReached60Percent: boolean;
}

export default function useMilestoneDetection({
  currentRevisoes,
  currentStrength,
  status,
  onMilestone
}: MilestoneDetectionProps) {
  const [milestoneState, setMilestoneState] = useState<MilestoneState>({
    milestone: null,
    previousRevisoes: currentRevisoes,
    previousStrength: currentStrength,
    hasReached60Percent: currentStrength >= 60
  });

  useEffect(() => {
    let detectedMilestone: MilestoneType | null = null;

    // Check for memorized status
    if (status === 'memorizado' && milestoneState.previousRevisoes < 3) {
      detectedMilestone = 'memorized';
    }
    // Check for revision milestones
    else if (currentRevisoes > milestoneState.previousRevisoes) {
      if (currentRevisoes === 1) {
        detectedMilestone = 'first_review';
      } else if (currentRevisoes === 2) {
        detectedMilestone = 'second_review';
      } else if (currentRevisoes === 3) {
        detectedMilestone = 'final_review';
      }
    }
    // Check for 60% strength milestone
    else if (
      currentStrength >= 60 && 
      milestoneState.previousStrength < 60 &&
      !milestoneState.hasReached60Percent
    ) {
      detectedMilestone = 'strength_milestone';
    }

    if (detectedMilestone) {
      setMilestoneState({
        milestone: detectedMilestone,
        previousRevisoes: currentRevisoes,
        previousStrength: currentStrength,
        hasReached60Percent: currentStrength >= 60 || milestoneState.hasReached60Percent
      });

      onMilestone?.(detectedMilestone);
    } else if (
      currentRevisoes !== milestoneState.previousRevisoes ||
      currentStrength !== milestoneState.previousStrength
    ) {
      // Update tracking state without triggering milestone
      setMilestoneState(prev => ({
        ...prev,
        previousRevisoes: currentRevisoes,
        previousStrength: currentStrength
      }));
    }
  }, [currentRevisoes, currentStrength, status]);

  const clearMilestone = () => {
    setMilestoneState(prev => ({
      ...prev,
      milestone: null
    }));
  };

  return {
    currentMilestone: milestoneState.milestone,
    clearMilestone
  };
}
