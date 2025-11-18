import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useResetProgress() {
  const [isResetting, setIsResetting] = useState(false);
  const { user } = useAuth();

  const resetProgress = async () => {
    if (!user) {
      toast.error('Usuário não encontrado');
      return false;
    }

    try {
      setIsResetting(true);
      toast.loading('Zerando progresso...', { id: 'reset-progress' });

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Sessão não encontrada');
      }

      const { data, error } = await supabase.functions.invoke('reset-user-progress', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;

      console.log('Reset progress result:', data);

      if (data?.success) {
        toast.success('Progresso zerado com sucesso! 🔄', { id: 'reset-progress' });
        
        // Forçar reload completo após 1.5 segundos
        setTimeout(() => {
          window.location.href = '/dashboard?t=' + Date.now();
        }, 1500);
      } else {
        toast.warning('Progresso parcialmente zerado. Verifique os logs.', { id: 'reset-progress' });
        console.warn('Reset details:', data?.details);
        
        // Ainda assim recarregar
        setTimeout(() => {
          window.location.href = '/dashboard?t=' + Date.now();
        }, 2000);
      }

      return true;
    } catch (error: any) {
      console.error('Error resetting progress:', error);
      toast.error('Erro ao zerar progresso: ' + error.message, { id: 'reset-progress' });
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  return { resetProgress, isResetting };
}
