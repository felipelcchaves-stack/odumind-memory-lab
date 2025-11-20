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
  const { user, session } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('[Changelog] Usuário detectado, verificando novidades...');
      checkForNewChangelog();
    }
  }, [user]);

  const checkForNewChangelog = async () => {
    if (!user) return;

    try {
      console.log('[Changelog] Buscando última versão...');
      
      // 1. Buscar última versão do changelog em destaque
      const { data: latestVersion, error: changelogError } = await supabase
        .from('changelog')
        .select('*')
        .eq('destaque', true)
        .order('release_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (changelogError || !latestVersion) {
        console.log('[Changelog] Nenhum changelog encontrado ou erro:', changelogError);
        return;
      }

      console.log('[Changelog] Versão encontrada:', latestVersion.version);

      // 2. Verificar se usuário já viu essa versão
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('last_viewed_changelog')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[Changelog] Erro ao buscar perfil:', profileError);
        return;
      }

      console.log('[Changelog] Última versão vista pelo usuário:', profile?.last_viewed_changelog);

      // 3. Se não viu, mostrar modal e marcar como não lido
      if (profile?.last_viewed_changelog !== latestVersion.version) {
        console.log('[Changelog] Nova versão detectada! Abrindo modal...');
        setLatestChangelog({
          ...latestVersion,
          items: latestVersion.items as unknown as ChangelogItem[]
        } as ChangelogVersion);
        setShowModal(true);
        setHasUnreadChangelog(true);
      } else {
        console.log('[Changelog] Usuário já viu esta versão.');
      }
    } catch (error) {
      console.error('[Changelog] Erro ao verificar changelog:', error);
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
