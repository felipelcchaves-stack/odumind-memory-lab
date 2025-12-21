import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FinancialSnapshot {
  id: string;
  reference_month: string;
  gross_revenue: number;
  gateway_fees: number;
  sales_commission: number;
  net_revenue: number;
  transaction_count: number;
  synced_at: string;
  source: string;
}

export function usePagarmeSync() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<FinancialSnapshot | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    return new Date().toISOString().slice(0, 7);
  };

  // Load snapshot for a specific month
  const loadSnapshot = useCallback(async (month?: string) => {
    const targetMonth = month || getCurrentMonth();
    setLoading(true);
    
    try {
      const { data, error } = await (supabase
        .from('financial_snapshots' as any)
        .select('*')
        .eq('reference_month', targetMonth)
        .eq('source', 'pagarme')
        .maybeSingle()) as any;

      if (error) throw error;
      
      setCurrentSnapshot(data);
    } catch (error) {
      console.error('Error loading snapshot:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all available months
  const loadAvailableMonths = useCallback(async () => {
    try {
      const { data, error } = await (supabase
        .from('financial_snapshots' as any)
        .select('reference_month')
        .eq('source', 'pagarme')
        .order('reference_month', { ascending: false })) as any;

      if (error) throw error;
      
      setAvailableMonths(data?.map((d: any) => d.reference_month) || []);
    } catch (error) {
      console.error('Error loading available months:', error);
    }
  }, []);

  // Sync with Pagar.me API
  const syncWithPagarme = useCallback(async (month?: string) => {
    const targetMonth = month || getCurrentMonth();
    setSyncing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado para sincronizar');
        return null;
      }

      const response = await supabase.functions.invoke('sync-pagarme-revenue', {
        body: { referenceMonth: targetMonth },
      });

      if (response.error) {
        console.error('Sync error:', response.error);
        toast.error(response.error.message || 'Erro ao sincronizar com Pagar.me');
        return null;
      }

      const result = response.data;
      
      if (result.error) {
        toast.error(result.error);
        return null;
      }

      toast.success(`Sincronizado! Receita líquida: R$ ${result.snapshot.netRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      
      // Reload the snapshot
      await loadSnapshot(targetMonth);
      await loadAvailableMonths();
      
      return result.snapshot;
    } catch (error: any) {
      console.error('Error syncing with Pagar.me:', error);
      toast.error(error.message || 'Erro ao sincronizar');
      return null;
    } finally {
      setSyncing(false);
    }
  }, [loadSnapshot, loadAvailableMonths]);

  // Initial load
  useEffect(() => {
    loadSnapshot();
    loadAvailableMonths();
  }, [loadSnapshot, loadAvailableMonths]);

  return {
    loading,
    syncing,
    currentSnapshot,
    availableMonths,
    loadSnapshot,
    syncWithPagarme,
    getCurrentMonth,
  };
}
