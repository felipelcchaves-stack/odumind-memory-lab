import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from './useNotifications';
import { predictForgetProbability } from '@/lib/adaptiveLearning';
import { toast } from 'sonner';

interface OduAtRisk {
  id: string;
  numero: number;
  nome: string;
  forgetProbability: number;
  hoursUntilForgotten: number;
  proxima_revisao: string | null;
}

export function useForgettingPrediction() {
  const { user } = useAuth();
  const { permission, scheduleNotification } = useNotifications();
  const [odusAtRisk, setOdusAtRisk] = useState<OduAtRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    checkForgettingRisk();
    
    // Verificar a cada 2 horas
    const interval = setInterval(checkForgettingRisk, 2 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  async function checkForgettingRisk() {
    if (!user) return;
    
    try {
      const { data: memData, error } = await supabase
        .from('memorizacao')
        .select(`
          id,
          forca_memoria,
          ultima_revisao,
          revisoes,
          proxima_revisao,
          odu (
            id,
            numero,
            nome
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'memorizado')
        .not('ultima_revisao', 'is', null);

      if (error) throw error;
      if (!memData) return;

      const atRisk: OduAtRisk[] = [];

      for (const mem of memData) {
        if (!mem.odu) continue;
        
        const odu = Array.isArray(mem.odu) ? mem.odu[0] : mem.odu;
        const forgetProb = predictForgetProbability(
          mem.forca_memoria,
          mem.ultima_revisao,
          mem.revisoes
        );

        // Se probabilidade de esquecer > 30%, está em risco
        if (forgetProb > 0.3) {
          const lastReview = new Date(mem.ultima_revisao!);
          const now = new Date();
          const hoursSinceReview = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60);
          
          // Estimar horas até esquecimento crítico (70% probabilidade)
          const hoursUntilCritical = calculateHoursUntilCritical(
            mem.forca_memoria,
            mem.revisoes,
            hoursSinceReview
          );

          atRisk.push({
            id: odu.id,
            numero: odu.numero,
            nome: odu.nome,
            forgetProbability: forgetProb,
            hoursUntilForgotten: hoursUntilCritical,
            proxima_revisao: mem.proxima_revisao
          });
        }
      }

      // Ordenar por maior risco
      atRisk.sort((a, b) => b.forgetProbability - a.forgetProbability);
      setOdusAtRisk(atRisk);

      // Enviar notificações preventivas
      if (atRisk.length > 0 && permission.granted) {
        schedulePreventiveNotifications(atRisk);
      }

    } catch (error) {
      console.error('Error checking forgetting risk:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateHoursUntilCritical(
    forcaMemoria: number,
    revisoes: number,
    hoursSinceReview: number
  ): number {
    // Baseado na curva de Ebbinghaus
    // Força de memória alta = mais tempo até esquecer
    const baseRetention = forcaMemoria / 100;
    const revisionBonus = Math.min(5, revisoes * 0.5);
    
    // Horas até atingir 70% de probabilidade de esquecimento
    const criticalHours = (baseRetention * 168) + (revisionBonus * 24); // 168h = 1 semana
    
    return Math.max(0, criticalHours - hoursSinceReview);
  }

  function schedulePreventiveNotifications(atRisk: OduAtRisk[]) {
    // Notificar apenas os 3 Odus com maior risco
    const topRisk = atRisk.slice(0, 3);

    topRisk.forEach((odu) => {
      const delayHours = Math.max(1, odu.hoursUntilForgotten - 6); // 6h antes do crítico
      
      scheduleNotification(
        `⚠️ Revisão Urgente: Odu ${odu.numero}`,
        `${odu.nome} está em risco de ser esquecido em ${Math.round(odu.hoursUntilForgotten)}h. Revise agora!`,
        `odu-risk-${odu.id}`,
        delayHours * 60 * 60 * 1000
      );
    });

    // Toast informativo
    if (topRisk.length > 0) {
      toast.warning(
        `${topRisk.length} Odu${topRisk.length > 1 ? 's' : ''} em risco de esquecimento`,
        {
          description: 'Você receberá notificações preventivas antes do momento crítico.',
          duration: 5000
        }
      );
    }
  }

  return {
    odusAtRisk,
    loading,
    checkForgettingRisk
  };
}
