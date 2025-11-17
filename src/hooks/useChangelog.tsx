import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ChangelogItem {
  tipo: 'novo' | 'melhoria' | 'correcao';
  titulo: string;
  descricao: string;
  icone?: string;
}

interface ChangelogVersion {
  id: string;
  version: string;
  titulo: string;
  release_date: string;
  items: ChangelogItem[];
  destaque: boolean;
}

export const useChangelog = () => {
  const [showModal, setShowModal] = useState(false);
  const [latestChangelog, setLatestChangelog] = useState<ChangelogVersion | null>(null);
  const [hasUnreadChangelog, setHasUnreadChangelog] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkForNewChangelog();
    }
  }, [user]);

  const checkForNewChangelog = async () => {
    if (!user) return;

    try {
      // 1. Buscar última versão do changelog em destaque
      const { data: latestVersion, error: changelogError } = await supabase
        .from('changelog')
        .select('*')
        .eq('destaque', true)
        .order('release_date', { ascending: false })
        .limit(1)
        .single();

      if (changelogError || !latestVersion) {
        console.log('No changelog found or error:', changelogError);
        return;
      }

      // 2. Verificar se usuário já viu essa versão
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('last_viewed_changelog')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      // 3. Se não viu, mostrar modal e marcar como não lido
      if (profile?.last_viewed_changelog !== latestVersion.version) {
        setLatestChangelog({
          ...latestVersion,
          items: latestVersion.items as unknown as ChangelogItem[]
        } as ChangelogVersion);
        setShowModal(true);
        setHasUnreadChangelog(true);
      }
    } catch (error) {
      console.error('Error checking changelog:', error);
    }
  };

  const markAsViewed = async () => {
    if (!latestChangelog || !user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_viewed_changelog: latestChangelog.version })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      setShowModal(false);
      setHasUnreadChangelog(false);
    } catch (error) {
      console.error('Error marking changelog as viewed:', error);
    }
  };

  return {
    showModal,
    latestChangelog,
    markAsViewed,
    setShowModal,
    hasUnreadChangelog,
    checkForNewChangelog,
  };
};
