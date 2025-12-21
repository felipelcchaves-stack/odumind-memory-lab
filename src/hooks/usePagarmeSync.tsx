import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateMetricsFromPagarme, PagarmeMetrics } from '@/lib/advancedAnalytics';
import { subMonths, format } from 'date-fns';

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
  // New fields
  tpv: number;
  charges_created: number;
  available_balance: number;
  waiting_funds: number;
  transferred_amount: number;
  average_ticket: number;
  charges_count: number;
  paid_charges_count: number;
}

export function usePagarmeSync() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingHistory, setSyncingHistory] = useState(false);
  const [historyProgress, setHistoryProgress] = useState(0);
  const [currentSnapshot, setCurrentSnapshot] = useState<FinancialSnapshot | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [calculatedMetrics, setCalculatedMetrics] = useState<PagarmeMetrics | null>(null);

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
      
      if (data) {
        // Map database fields to interface, handling null values
        const snapshot: FinancialSnapshot = {
          ...data,
          tpv: Number(data.tpv) || 0,
          charges_created: Number(data.charges_created) || 0,
          available_balance: Number(data.available_balance) || 0,
          waiting_funds: Number(data.waiting_funds) || 0,
          transferred_amount: Number(data.transferred_amount) || 0,
          average_ticket: Number(data.average_ticket) || 0,
          charges_count: Number(data.charges_count) || 0,
          paid_charges_count: Number(data.paid_charges_count) || 0,
          gross_revenue: Number(data.gross_revenue) || 0,
          gateway_fees: Number(data.gateway_fees) || 0,
          net_revenue: Number(data.net_revenue) || 0,
          sales_commission: Number(data.sales_commission) || 0,
          transaction_count: Number(data.transaction_count) || 0,
        };
        setCurrentSnapshot(snapshot);
        
        // Calculate metrics from snapshot
        const metrics = await calculateMetricsFromPagarme({
          reference_month: snapshot.reference_month,
          gross_revenue: snapshot.gross_revenue,
          net_revenue: snapshot.net_revenue,
          gateway_fees: snapshot.gateway_fees,
          tpv: snapshot.tpv,
          average_ticket: snapshot.average_ticket,
          paid_charges_count: snapshot.paid_charges_count,
          charges_count: snapshot.charges_count,
          available_balance: snapshot.available_balance,
          waiting_funds: snapshot.waiting_funds,
        });
        setCalculatedMetrics(metrics);
      } else {
        setCurrentSnapshot(null);
        setCalculatedMetrics(null);
      }
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

      const filteredInfo = result.snapshot.isesemindChargesFiltered !== undefined
        ? ` (${result.snapshot.isesemindChargesFiltered} Isesemind de ${result.snapshot.totalChargesBeforeFilter} total)`
        : '';

      toast.success(`Sincronizado! TPV: R$ ${result.snapshot.tpv?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}${filteredInfo}`);
      
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

  // Sync historical data (last 12 months)
  const syncHistoricalData = useCallback(async (months: number = 12) => {
    setSyncingHistory(true);
    setHistoryProgress(0);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado para sincronizar');
        return;
      }

      const today = new Date();
      const results: { month: string; success: boolean }[] = [];

      for (let i = 0; i < months; i++) {
        const monthDate = subMonths(today, i);
        const monthString = format(monthDate, 'yyyy-MM');
        
        setHistoryProgress(((i + 1) / months) * 100);

        try {
          const response = await supabase.functions.invoke('sync-pagarme-revenue', {
            body: { referenceMonth: monthString },
          });

          results.push({ 
            month: monthString, 
            success: !response.error && !response.data?.error 
          });
        } catch (err) {
          results.push({ month: monthString, success: false });
        }

        // Delay between requests to avoid rate limiting
        if (i < months - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const successCount = results.filter(r => r.success).length;
      toast.success(`Histórico sincronizado! ${successCount}/${months} meses`);

      // Reload current data
      await loadSnapshot();
      await loadAvailableMonths();

    } catch (error: any) {
      console.error('Error syncing historical data:', error);
      toast.error('Erro ao sincronizar histórico');
    } finally {
      setSyncingHistory(false);
      setHistoryProgress(0);
    }
  }, [loadSnapshot, loadAvailableMonths]);

  // Recalculate metrics with new settings
  const recalculateMetrics = useCallback(async (
    salesCommissionPercent: number,
    targetOverride?: { mrrTarget?: number; churnTarget?: number }
  ) => {
    if (!currentSnapshot) return;

    const metrics = await calculateMetricsFromPagarme({
      reference_month: currentSnapshot.reference_month,
      gross_revenue: currentSnapshot.gross_revenue,
      net_revenue: currentSnapshot.net_revenue,
      gateway_fees: currentSnapshot.gateway_fees,
      tpv: currentSnapshot.tpv,
      average_ticket: currentSnapshot.average_ticket,
      paid_charges_count: currentSnapshot.paid_charges_count,
      charges_count: currentSnapshot.charges_count,
      available_balance: currentSnapshot.available_balance,
      waiting_funds: currentSnapshot.waiting_funds,
    }, salesCommissionPercent, targetOverride);
    
    setCalculatedMetrics(metrics);
  }, [currentSnapshot]);

  // Initial load
  useEffect(() => {
    loadSnapshot();
    loadAvailableMonths();
  }, [loadSnapshot, loadAvailableMonths]);

  return {
    loading,
    syncing,
    syncingHistory,
    historyProgress,
    currentSnapshot,
    availableMonths,
    calculatedMetrics,
    loadSnapshot,
    syncWithPagarme,
    syncHistoricalData,
    recalculateMetrics,
    getCurrentMonth,
  };
}
