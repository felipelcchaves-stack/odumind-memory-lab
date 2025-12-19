import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface AdvancedMetrics {
  conversionRate: number;
  retentionRate: number;
  churnRate: number;
  ltv: number;
  cac: number;
  mrr: number;
  arr: number;
  activeUsers: number;
  totalUsers: number;
}

export interface MonthlyComparison {
  month: string;
  metrics: AdvancedMetrics;
}

export interface DemographicData {
  pais: string;
  estado: string;
  sexo: string;
  faixaEtaria: string;
  totalUsuarios: number;
}

export async function calculateAdvancedMetrics(startDate: Date, endDate: Date): Promise<AdvancedMetrics> {
  try {
    // Plan prices with interval info (monthly or yearly)
    const planPrices: Record<string, { price: number; interval: 'monthly' | 'yearly' }> = {
      'Akapo': { price: 49.90, interval: 'monthly' },
      'Awo': { price: 97.00, interval: 'monthly' },
      'Egbe': { price: 129.90, interval: 'monthly' },
      'Família': { price: 129.90, interval: 'monthly' },
      'Premium': { price: 97.00, interval: 'monthly' },
      'Profissional': { price: 697.00, interval: 'yearly' }, // Guru annual plan
      'Gratuito': { price: 0, interval: 'monthly' },
    };

    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .lte('created_at', endDate.toISOString());

    // All currently active subscriptions (for MRR calculation - no date filter)
    const { data: currentSubscriptions } = await supabase
      .from('subscriptions')
      .select('plan_name, user_id')
      .in('status', ['active', 'trialing']);

    // Count active paying users (exclude free plan)
    const activePayingSubscriptions = currentSubscriptions?.filter(
      sub => sub.plan_name !== 'Gratuito' && sub.plan_name !== 'free'
    ) || [];
    
    const activeUsersCount = activePayingSubscriptions.length;

    // Conversion rate: (paying subscriptions / total users) * 100
    const conversionRate = totalUsers ? (activeUsersCount / (totalUsers || 1)) * 100 : 0;

    // Users who started in previous month
    const previousMonthStart = subMonths(startDate, 1);
    const previousMonthEnd = endOfMonth(previousMonthStart);
    
    const { count: previousMonthUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString());

    // Retention: users from previous month still active
    const { data: retainedUsers } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('status', ['active', 'trialing'])
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString());

    const retentionRate = previousMonthUsers ? ((retainedUsers?.length || 0) / (previousMonthUsers || 1)) * 100 : 0;

    // Churn rate: 100 - retention rate
    const churnRate = 100 - retentionRate;

    // MRR calculation - considers yearly plans divided by 12
    const mrr = activePayingSubscriptions.reduce((sum, sub) => {
      const plan = planPrices[sub.plan_name];
      if (!plan || plan.price === 0) return sum;
      // Divide annual plans by 12 to get monthly revenue
      return sum + (plan.interval === 'yearly' ? plan.price / 12 : plan.price);
    }, 0);

    const arr = mrr * 12;

    // LTV: Average revenue per user * average customer lifetime (months)
    const averageLifetimeMonths = retentionRate > 0 ? 1 / (churnRate / 100) : 12;
    const ltv = (mrr / (activeUsersCount || 1)) * averageLifetimeMonths;

    // CAC: assuming a simple calculation (would need marketing spend data)
    // For now, using a placeholder calculation
    const cac = 0; // This should be calculated from marketing spend data

    return {
      conversionRate: Number(conversionRate.toFixed(2)),
      retentionRate: Number(retentionRate.toFixed(2)),
      churnRate: Number(churnRate.toFixed(2)),
      ltv: Number(ltv.toFixed(2)),
      cac: Number(cac.toFixed(2)),
      mrr: Number(mrr.toFixed(2)),
      arr: Number(arr.toFixed(2)),
      activeUsers: activeUsersCount,
      totalUsers: totalUsers || 0
    };
  } catch (error) {
    console.error('Error calculating advanced metrics:', error);
    return {
      conversionRate: 0,
      retentionRate: 0,
      churnRate: 0,
      ltv: 0,
      cac: 0,
      mrr: 0,
      arr: 0,
      activeUsers: 0,
      totalUsers: 0
    };
  }
}

export async function getMonthlyComparison(months: number = 6): Promise<MonthlyComparison[]> {
  const comparisons: MonthlyComparison[] = [];
  const today = new Date();

  for (let i = 0; i < months; i++) {
    const monthDate = subMonths(today, i);
    const startDate = startOfMonth(monthDate);
    const endDate = endOfMonth(monthDate);

    const metrics = await calculateAdvancedMetrics(startDate, endDate);
    
    comparisons.push({
      month: format(monthDate, 'MMM yyyy'),
      metrics
    });
  }

  return comparisons.reverse();
}

export async function getDemographicData(): Promise<DemographicData[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('pais, estado, sexo, data_nascimento')
      .eq('profile_completed', true);

    if (error) throw error;

    // Process data to get demographics
    const demographicMap = new Map<string, DemographicData>();

    data?.forEach(profile => {
      const age = profile.data_nascimento 
        ? new Date().getFullYear() - new Date(profile.data_nascimento).getFullYear()
        : null;

      let faixaEtaria = 'nao_informado';
      if (age !== null) {
        if (age < 18) faixaEtaria = 'menor_18';
        else if (age <= 24) faixaEtaria = '18_24';
        else if (age <= 34) faixaEtaria = '25_34';
        else if (age <= 44) faixaEtaria = '35_44';
        else if (age <= 54) faixaEtaria = '45_54';
        else faixaEtaria = '55_mais';
      }

      const key = `${profile.pais}-${profile.estado}-${profile.sexo}-${faixaEtaria}`;
      
      if (demographicMap.has(key)) {
        const existing = demographicMap.get(key)!;
        existing.totalUsuarios++;
      } else {
        demographicMap.set(key, {
          pais: profile.pais || 'Não informado',
          estado: profile.estado || 'Não informado',
          sexo: profile.sexo || 'nao_informado',
          faixaEtaria,
          totalUsuarios: 1
        });
      }
    });

    return Array.from(demographicMap.values());
  } catch (error) {
    console.error('Error getting demographic data:', error);
    return [];
  }
}
