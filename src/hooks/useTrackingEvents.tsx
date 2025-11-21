import { usePixelTracking } from './usePixelTracking';
import { useCallback } from 'react';

export const useTrackingEvents = () => {
  const {
    trackSignUp,
    trackPurchase,
    trackInitiateCheckout,
    trackAddToCart,
    trackViewContent,
  } = usePixelTracking();

  const trackAchievementUnlocked = useCallback((achievementName: string, xp: number) => {
    console.log('Tracking achievement unlocked:', achievementName);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'AchievementUnlocked', {
        achievement_name: achievementName,
        xp_earned: xp,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'achievement_unlocked', {
        achievement_name: achievementName,
        xp_earned: xp,
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('AchievementUnlocked', {
        achievement_name: achievementName,
      });
    }
  }, []);

  const trackReferralUsed = useCallback((referralCode: string) => {
    console.log('Tracking referral used:', referralCode);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'ReferralUsed', {
        referral_code: referralCode,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'referral_used', {
        referral_code: referralCode,
      });
    }

    // TikTok Pixel
    if (window.ttq?.track) {
      window.ttq.track('ReferralUsed', {
        referral_code: referralCode,
      });
    }
  }, []);

  const trackStudySessionCompleted = useCallback((
    sessionDuration: number,
    cardsStudied: number,
    accuracy: number
  ) => {
    console.log('Tracking study session completed');

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'StudySessionCompleted', {
        duration_minutes: sessionDuration,
        cards_studied: cardsStudied,
        accuracy_percentage: accuracy,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'study_session_completed', {
        duration_minutes: sessionDuration,
        cards_studied: cardsStudied,
        accuracy_percentage: accuracy,
      });
    }
  }, []);

  const trackOduMemorized = useCallback((oduNumber: number, oduName: string) => {
    console.log('Tracking Odu memorized:', oduName);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'OduMemorized', {
        odu_number: oduNumber,
        odu_name: oduName,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'odu_memorized', {
        odu_number: oduNumber,
        odu_name: oduName,
      });
    }
  }, []);

  const trackStreakMilestone = useCallback((streakDays: number) => {
    console.log('Tracking streak milestone:', streakDays);

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'StreakMilestone', {
        streak_days: streakDays,
      });
    }

    // Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'streak_milestone', {
        streak_days: streakDays,
      });
    }
  }, []);

  return {
    // Core tracking
    trackSignUp,
    trackPurchase,
    trackInitiateCheckout,
    trackAddToCart,
    trackViewContent,
    // Custom events
    trackAchievementUnlocked,
    trackReferralUsed,
    trackStudySessionCompleted,
    trackOduMemorized,
    trackStreakMilestone,
  };
};