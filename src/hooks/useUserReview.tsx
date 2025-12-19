import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserReview {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  is_featured: boolean;
  xp_at_review: number;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewSettings {
  minXp: number;
  minCountToShow: number;
  showOnLanding: boolean;
}

export const useUserReview = () => {
  const { user } = useAuth();
  const [userReview, setUserReview] = useState<UserReview | null>(null);
  const [userXp, setUserXp] = useState<number>(0);
  const [settings, setSettings] = useState<ReviewSettings>({
    minXp: 500,
    minCountToShow: 50,
    showOnLanding: true
  });
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['review_min_xp', 'review_min_count_to_show', 'review_show_on_landing']);

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach(s => { settingsMap[s.key] = s.value || ''; });
        
        setSettings({
          minXp: parseInt(settingsMap['review_min_xp'] || '500'),
          minCountToShow: parseInt(settingsMap['review_min_count_to_show'] || '100'),
          showOnLanding: settingsMap['review_show_on_landing'] === 'true'
        });
      }
    } catch (error) {
      console.error('Error loading review settings:', error);
    }
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, nome')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserXp(profile.xp || 0);
      }

      // Get user's existing review
      const { data: review } = await supabase
        .from('user_reviews')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (review) {
        setUserReview(review);
        setHasReviewed(true);
      }

      // Check if user can review
      const xp = profile?.xp || 0;
      setCanReview(xp >= settings.minXp);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, settings.minXp]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const submitReview = async (rating: number, comment: string, displayName: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para avaliar');
      return false;
    }

    if (userXp < settings.minXp) {
      toast.error(`Você precisa de pelo menos ${settings.minXp} XP para avaliar`);
      return false;
    }

    try {
      if (hasReviewed && userReview) {
        // Update existing review
        const { error } = await supabase
          .from('user_reviews')
          .update({
            rating,
            comment: comment || null,
            display_name: displayName || null,
            xp_at_review: userXp
          })
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Sua avaliação foi atualizada!');
      } else {
        // Create new review
        const { error } = await supabase
          .from('user_reviews')
          .insert({
            user_id: user.id,
            rating,
            comment: comment || null,
            display_name: displayName || null,
            xp_at_review: userXp
          });

        if (error) throw error;

        // Award XP for first review
        await supabase
          .from('profiles')
          .update({ xp: userXp + 50 })
          .eq('user_id', user.id);

        // Log gamification event
        await supabase
          .from('gamification_logs')
          .insert({
            user_id: user.id,
            tipo_evento: 'review_submitted',
            valor: 50,
            detalhes: { rating }
          });

        toast.success('Obrigado pela sua avaliação! +50 XP');
      }

      await loadUserData();
      return true;
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error('Erro ao enviar avaliação');
      return false;
    }
  };

  return {
    userReview,
    userXp,
    settings,
    loading,
    canReview,
    hasReviewed,
    submitReview,
    reload: loadUserData
  };
};

// Hook para buscar avaliações públicas (landing page)
export const usePublicReviews = () => {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [minCountToShow, setMinCountToShow] = useState(100);
  const [showOnLanding, setShowOnLanding] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load settings
        const { data: settingsData } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['review_min_count_to_show', 'review_show_on_landing']);

        if (settingsData) {
          const settingsMap: Record<string, string> = {};
          settingsData.forEach(s => { settingsMap[s.key] = s.value || ''; });
          setMinCountToShow(parseInt(settingsMap['review_min_count_to_show'] || '50'));
          setShowOnLanding(settingsMap['review_show_on_landing'] === 'true');
        }

        // Get total count of 5-star approved reviews
        const { count } = await supabase
          .from('user_reviews')
          .select('*', { count: 'exact', head: true })
          .eq('rating', 5)
          .eq('is_approved', true);

        setTotalCount(count || 0);

        // Get reviews for carousel
        const { data: reviewsData } = await supabase
          .from('user_reviews')
          .select('*')
          .eq('rating', 5)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(20);

        setReviews(reviewsData || []);
      } catch (error) {
        console.error('Error loading public reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const shouldShow = showOnLanding && totalCount >= minCountToShow;

  return {
    reviews,
    totalCount,
    minCountToShow,
    shouldShow,
    loading
  };
};
