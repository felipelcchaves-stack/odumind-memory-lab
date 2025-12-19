import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export interface RenewalData {
  userId: string;
  userName: string;
  userEmail: string;
  planName: string;
  expiresAt: string;
  daysUntilExpiry: number;
  monthlyValue: number;
}

export interface RenewalSummary {
  next30Days: { count: number; revenue: number; renewals: RenewalData[] };
  next90Days: { count: number; revenue: number; renewals: RenewalData[] };
  next12Months: { count: number; revenue: number; renewals: RenewalData[] };
  byMonth: { month: string; count: number; revenue: number }[];
}

export interface SalesTrendData {
  month: string;
  salesCount: number;
  revenue: number;
  planBreakdown: { [plan: string]: { count: number; revenue: number } };
}

export interface GrowthMetrics {
  averageSalesPerMonth: number;
  averageRevenuePerMonth: number;
  momGrowth: number;
  revenueGrowth: number;
  trend: 'growing' | 'stable' | 'declining';
  movingAverage: number[];
}

// Plan prices with interval info (monthly or yearly)
const planPrices: Record<string, { price: number; interval: 'monthly' | 'yearly' }> = {
  'Akapo': { price: 49.90, interval: 'monthly' },
  'Awo': { price: 97.00, interval: 'monthly' },
  'Egbe': { price: 129.90, interval: 'monthly' },
  'Família': { price: 129.90, interval: 'monthly' },
  'Premium': { price: 97.00, interval: 'monthly' },
  'Profissional': { price: 697.00, interval: 'yearly' },
  'Gratuito': { price: 0, interval: 'monthly' },
};

export async function calculateAdvancedMetrics(startDate: Date, endDate: Date): Promise<AdvancedMetrics> {
  try {
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

export async function getRenewalForecast(): Promise<RenewalSummary> {
  try {
    const today = new Date();
    
    // Fetch all active subscriptions with expiration dates
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        user_id,
        plan_name,
        current_period_end,
        status
      `)
      .in('status', ['active', 'trialing'])
      .not('plan_name', 'eq', 'Gratuito');

    if (error) throw error;

    // Get user details for the subscriptions
    const userIds = subscriptions?.map(s => s.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nome')
      .in('user_id', userIds);

    const { data: emails } = await supabase.rpc('get_user_emails', { user_ids: userIds });

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const emailMap = new Map(emails?.map((e: any) => [e.user_id, e.email]) || []);

    // Process renewals
    const renewals: RenewalData[] = (subscriptions || []).map(sub => {
      const expiresAt = sub.current_period_end ? new Date(sub.current_period_end) : null;
      const daysUntilExpiry = expiresAt ? differenceInDays(expiresAt, today) : 999;
      const plan = planPrices[sub.plan_name] || { price: 0, interval: 'monthly' as const };
      const monthlyValue = plan.interval === 'yearly' ? plan.price / 12 : plan.price;
      const profile = profileMap.get(sub.user_id);

      return {
        userId: sub.user_id,
        userName: profile?.nome || 'Usuário',
        userEmail: emailMap.get(sub.user_id) || '',
        planName: sub.plan_name,
        expiresAt: expiresAt?.toISOString() || '',
        daysUntilExpiry,
        monthlyValue: plan.price // Use full value for renewal
      };
    }).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    // Calculate summaries
    const next30Days = renewals.filter(r => r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 30);
    const next90Days = renewals.filter(r => r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 90);
    const next12Months = renewals.filter(r => r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 365);

    // Group by month
    const byMonthMap = new Map<string, { count: number; revenue: number }>();
    for (let i = 0; i < 12; i++) {
      const monthDate = addDays(today, i * 30);
      const monthKey = format(monthDate, 'MMM yyyy', { locale: ptBR });
      byMonthMap.set(monthKey, { count: 0, revenue: 0 });
    }

    renewals.forEach(r => {
      if (r.expiresAt && r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= 365) {
        const monthKey = format(new Date(r.expiresAt), 'MMM yyyy', { locale: ptBR });
        const existing = byMonthMap.get(monthKey);
        if (existing) {
          existing.count++;
          existing.revenue += r.monthlyValue;
        }
      }
    });

    return {
      next30Days: {
        count: next30Days.length,
        revenue: next30Days.reduce((sum, r) => sum + r.monthlyValue, 0),
        renewals: next30Days
      },
      next90Days: {
        count: next90Days.length,
        revenue: next90Days.reduce((sum, r) => sum + r.monthlyValue, 0),
        renewals: next90Days
      },
      next12Months: {
        count: next12Months.length,
        revenue: next12Months.reduce((sum, r) => sum + r.monthlyValue, 0),
        renewals: next12Months
      },
      byMonth: Array.from(byMonthMap.entries()).map(([month, data]) => ({
        month,
        ...data
      }))
    };
  } catch (error) {
    console.error('Error getting renewal forecast:', error);
    return {
      next30Days: { count: 0, revenue: 0, renewals: [] },
      next90Days: { count: 0, revenue: 0, renewals: [] },
      next12Months: { count: 0, revenue: 0, renewals: [] },
      byMonth: []
    };
  }
}

export async function getSalesTrend(months: number = 12): Promise<SalesTrendData[]> {
  try {
    const today = new Date();
    const results: SalesTrendData[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);

      // Fetch subscriptions created in this month
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('plan_name, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('plan_name', 'eq', 'Gratuito');

      const planBreakdown: { [plan: string]: { count: number; revenue: number } } = {};
      let totalRevenue = 0;

      (subscriptions || []).forEach(sub => {
        const plan = planPrices[sub.plan_name] || { price: 0 };
        if (!planBreakdown[sub.plan_name]) {
          planBreakdown[sub.plan_name] = { count: 0, revenue: 0 };
        }
        planBreakdown[sub.plan_name].count++;
        planBreakdown[sub.plan_name].revenue += plan.price;
        totalRevenue += plan.price;
      });

      results.push({
        month: format(monthDate, 'MMM yyyy', { locale: ptBR }),
        salesCount: subscriptions?.length || 0,
        revenue: totalRevenue,
        planBreakdown
      });
    }

    return results;
  } catch (error) {
    console.error('Error getting sales trend:', error);
    return [];
  }
}

export function calculateGrowthMetrics(salesData: SalesTrendData[]): GrowthMetrics {
  if (salesData.length === 0) {
    return {
      averageSalesPerMonth: 0,
      averageRevenuePerMonth: 0,
      momGrowth: 0,
      revenueGrowth: 0,
      trend: 'stable',
      movingAverage: []
    };
  }

  const totalSales = salesData.reduce((sum, d) => sum + d.salesCount, 0);
  const totalRevenue = salesData.reduce((sum, d) => sum + d.revenue, 0);
  const averageSalesPerMonth = totalSales / salesData.length;
  const averageRevenuePerMonth = totalRevenue / salesData.length;

  // Calculate MoM growth (compare last month to previous)
  let momGrowth = 0;
  let revenueGrowth = 0;
  if (salesData.length >= 2) {
    const lastMonth = salesData[salesData.length - 1];
    const previousMonth = salesData[salesData.length - 2];
    
    if (previousMonth.salesCount > 0) {
      momGrowth = ((lastMonth.salesCount - previousMonth.salesCount) / previousMonth.salesCount) * 100;
    }
    if (previousMonth.revenue > 0) {
      revenueGrowth = ((lastMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100;
    }
  }

  // Calculate 3-month moving average
  const movingAverage: number[] = [];
  for (let i = 2; i < salesData.length; i++) {
    const avg = (salesData[i].salesCount + salesData[i-1].salesCount + salesData[i-2].salesCount) / 3;
    movingAverage.push(Number(avg.toFixed(2)));
  }

  // Determine trend based on moving average
  let trend: 'growing' | 'stable' | 'declining' = 'stable';
  if (movingAverage.length >= 2) {
    const recentAvg = movingAverage.slice(-3);
    const firstHalf = recentAvg.slice(0, Math.ceil(recentAvg.length / 2));
    const secondHalf = recentAvg.slice(Math.ceil(recentAvg.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.1) trend = 'growing';
    else if (secondAvg < firstAvg * 0.9) trend = 'declining';
  }

  return {
    averageSalesPerMonth: Number(averageSalesPerMonth.toFixed(2)),
    averageRevenuePerMonth: Number(averageRevenuePerMonth.toFixed(2)),
    momGrowth: Number(momGrowth.toFixed(2)),
    revenueGrowth: Number(revenueGrowth.toFixed(2)),
    trend,
    movingAverage
  };
}
