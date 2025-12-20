import { useEffect, useState, useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: 'info' | 'novidade' | 'alerta' | 'promocao';
  show_to: 'todos' | 'free' | 'premium' | 'admins';
  created_at: string;
}

export function useAnnouncements() {
  const { subscription } = useSubscription();
  const { isAdmin } = useAdmin();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Use direct auth state to avoid hot reload issues
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => authSubscription.unsubscribe();
  }, []);

  const fetchUnreadAnnouncement = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get active announcements
      const { data: announcements, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!announcements || announcements.length === 0) {
        setAnnouncement(null);
        setLoading(false);
        return;
      }

      const activeAnnouncement = announcements[0];

      // Check if user should see this announcement based on show_to
      const isPremium = subscription?.status === 'active' || subscription?.status === 'trialing';
      const showTo = activeAnnouncement.show_to;

      let shouldShow = false;
      if (showTo === 'todos') {
        shouldShow = true;
      } else if (showTo === 'free' && !isPremium) {
        shouldShow = true;
      } else if (showTo === 'premium' && isPremium) {
        shouldShow = true;
      } else if (showTo === 'admins' && isAdmin) {
        shouldShow = true;
      }

      if (!shouldShow) {
        setAnnouncement(null);
        setLoading(false);
        return;
      }

      // Check if user already read this announcement
      const { data: readRecord } = await supabase
        .from('user_announcements_read')
        .select('id')
        .eq('user_id', user.id)
        .eq('announcement_id', activeAnnouncement.id)
        .single();

      if (readRecord) {
        // Already read
        setAnnouncement(null);
      } else {
        setAnnouncement(activeAnnouncement as Announcement);
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
      setAnnouncement(null);
    } finally {
      setLoading(false);
    }
  }, [user, subscription, isAdmin]);

  useEffect(() => {
    fetchUnreadAnnouncement();
  }, [fetchUnreadAnnouncement]);

  const markAsRead = useCallback(async () => {
    if (!user || !announcement) return;

    try {
      const { error } = await supabase
        .from('user_announcements_read')
        .insert({
          user_id: user.id,
          announcement_id: announcement.id
        });

      if (error) throw error;

      setAnnouncement(null);
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  }, [user, announcement]);

  return {
    announcement,
    loading,
    markAsRead,
    refetch: fetchUnreadAnnouncement
  };
}
