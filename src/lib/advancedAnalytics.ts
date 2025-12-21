import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AdvancedMetrics {
  conversionRate: number;
  retentionRate: number;
  churnRate: number;
  ltv: number;
  cac: number;
  mrr: number;              // MRR Bruto (o que o cliente paga)
  arr: number;              // ARR Bruto
  activeUsers: number;
  totalUsers: number;
  
  // Financial metrics - 4 níveis de receita
  mrrAfterGateway: number;     // MRR após taxas do gateway
  mrrAfterCommission: number;  // MRR após comissão de vendedores
  mrrNet: number;              // MRR líquido real (após todas as taxas)
  arrAfterGateway: number;     // ARR após taxas do gateway
  arrAfterCommission: number;  // ARR após comissão de vendedores
  arrNet: number;              // ARR líquido real
  
  // Breakdown das taxas
  gatewayFeeAmount: number;       // Valor das taxas do gateway
  salesCommissionAmount: number;  // Valor da comissão de vendedores
  operationalTaxAmount: number;   // Valor de outras taxas/impostos
  totalFeesAmount: number;        // Total de taxas
  
  // Planejamento
  commissionAmount: number; // Deprecated: mantido para compatibilidade
  mrrTarget: number;        // Meta configurada
  arrTarget: number;        // Meta configurada
  gapToTarget: number;      // Gap para meta (baseado em mrrNet)
  targetProgress: number;   // % atingido (0-100)
  customersNeeded: number;  // Clientes necessários para meta
  monthsToTarget: number;   // Meses estimados para meta
  averageTicket: number;    // Ticket médio líquido
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

// Default fallback prices (used when DB fetch fails or for unmapped plans)
const DEFAULT_PLAN_PRICES: Record<string, { price: number; interval: 'monthly' | 'yearly' }> = {
  'Akapo': { price: 49.90, interval: 'monthly' },
  'Awo': { price: 97.00, interval: 'monthly' },
  'Egbe': { price: 129.90, interval: 'monthly' },
  'Família': { price: 129.90, interval: 'monthly' },
  'Premium': { price: 97.00, interval: 'monthly' },
  'Profissional': { price: 697.00, interval: 'yearly' },
  'Gratuito': { price: 0, interval: 'monthly' },
};

// Cache for plan prices (refreshed every 5 minutes)
let planPricesCache: Record<string, { price: number; interval: 'monthly' | 'yearly' }> | null = null;
let planPricesCacheTime: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Fetch plan prices from database
async function getPlanPrices(): Promise<Record<string, { price: number; interval: 'monthly' | 'yearly' }>> {
  const now = Date.now();
  
  // Return cached prices if still valid
  if (planPricesCache && (now - planPricesCacheTime) < CACHE_DURATION_MS) {
    return planPricesCache;
  }
  
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('nome, preco, periodo')
      .eq('ativo', true);
    
    if (error) {
      console.error('Error fetching plan prices from DB:', error);
      return DEFAULT_PLAN_PRICES;
    }
    
    const prices: Record<string, { price: number; interval: 'monthly' | 'yearly' }> = {
      ...DEFAULT_PLAN_PRICES // Start with defaults
    };
    
    // Override with database values
    plans?.forEach(plan => {
      const interval: 'monthly' | 'yearly' = plan.periodo === 'anual' ? 'yearly' : 'monthly';
      prices[plan.nome] = { price: plan.preco, interval };
    });
    
    // Update cache
    planPricesCache = prices;
    planPricesCacheTime = now;
    
    console.log('Plan prices refreshed from database:', Object.keys(prices).length, 'plans');
    
    return prices;
  } catch (error) {
    console.error('Failed to fetch plan prices:', error);
    return DEFAULT_PLAN_PRICES;
  }
}

export interface FinancialConfig {
  // Taxas do Gateway
  gatewayFeePercent: number;      // Ex: 0.0399 para 3.99%
  gatewayFeeFixed: number;        // Ex: 0.39 para R$ 0,39
  
  // Comissão de Vendedores
  salesCommissionPercent: number; // Ex: 0.10 para 10%
  
  // Outras taxas
  operationalTaxPercent: number;  // Ex: 0.05 para 5%
  
  // Metas
  mrrTarget: number;
  arrTarget: number;
  expectedChurnRate: number;
}

const DEFAULT_FINANCIAL_CONFIG: FinancialConfig = {
  gatewayFeePercent: 0.0399,
  gatewayFeeFixed: 0.39,
  salesCommissionPercent: 0.10,
  operationalTaxPercent: 0,
  mrrTarget: 10000,
  arrTarget: 120000,
  expectedChurnRate: 0.05,
};

export async function calculateAdvancedMetrics(
  startDate: Date, 
  endDate: Date,
  financialConfig: FinancialConfig = DEFAULT_FINANCIAL_CONFIG
): Promise<AdvancedMetrics> {
  try {
    // Fetch dynamic plan prices from database
    const planPrices = await getPlanPrices();
    
    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .lte('created_at', endDate.toISOString());

    // All currently active subscriptions (for MRR calculation - no date filter)
    // Incluir amount_paid para cálculo de MRR real
    const { data: currentSubscriptions } = await supabase
      .from('subscriptions')
      .select('plan_name, user_id, amount_paid, current_period_end')
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

    // MRR calculation - priorizar valores reais pagos (amount_paid)
    const mrr = activePayingSubscriptions.reduce((sum, sub) => {
      // Se tem amount_paid (valor real pago), usar ele
      if (sub.amount_paid && sub.amount_paid > 0) {
        const plan = planPrices[sub.plan_name];
        // Se for plano anual, dividir por 12 para obter MRR
        const isYearly = plan?.interval === 'yearly';
        return sum + (isYearly ? sub.amount_paid / 12 : sub.amount_paid);
      }
      
      // Fallback: usar tabela de preços dinâmica do banco
      const plan = planPrices[sub.plan_name];
      if (!plan || plan.price === 0) return sum;
      return sum + (plan.interval === 'yearly' ? plan.price / 12 : plan.price);
    }, 0);

    const arr = mrr * 12;

    // LTV: Average revenue per user * average customer lifetime (months)
    const averageLifetimeMonths = retentionRate > 0 ? 1 / (churnRate / 100) : 12;
    const ltv = (mrr / (activeUsersCount || 1)) * averageLifetimeMonths;

    // CAC: assuming a simple calculation (would need marketing spend data)
    // For now, using a placeholder calculation
    const cac = 0; // This should be calculated from marketing spend data

    // Financial calculations - 4 níveis de receita
    const { 
      gatewayFeePercent = 0.0399, 
      gatewayFeeFixed = 0.39,
      salesCommissionPercent = 0.10,
      operationalTaxPercent = 0,
      mrrTarget, 
      arrTarget,
    } = financialConfig;
    
    // 1. MRR Bruto (o que o cliente paga) - já calculado acima
    
    // 2. Taxas do Gateway (Pagar.me/Guru)
    // Taxa percentual + taxa fixa por transação
    const gatewayPercentFee = mrr * gatewayFeePercent;
    const gatewayFixedFee = activeUsersCount * gatewayFeeFixed;
    const gatewayFeeAmount = gatewayPercentFee + gatewayFixedFee;
    const mrrAfterGateway = mrr - gatewayFeeAmount;
    
    // 3. Comissão de Vendedores
    const salesCommissionAmount = mrrAfterGateway * salesCommissionPercent;
    const mrrAfterCommission = mrrAfterGateway - salesCommissionAmount;
    
    // 4. Outras taxas operacionais/impostos
    const operationalTaxAmount = mrrAfterCommission * operationalTaxPercent;
    const mrrNet = mrrAfterCommission - operationalTaxAmount;
    
    // Total de taxas
    const totalFeesAmount = gatewayFeeAmount + salesCommissionAmount + operationalTaxAmount;
    
    // ARR nos 4 níveis
    const arrAfterGateway = mrrAfterGateway * 12;
    const arrAfterCommission = mrrAfterCommission * 12;
    const arrNet = mrrNet * 12;
    
    // Legacy: commissionAmount para compatibilidade
    const commissionAmount = totalFeesAmount;

    // Target progress calculations (baseado no MRR líquido real)
    const gapToTarget = Math.max(0, mrrTarget - mrrNet);
    const targetProgress = mrrTarget > 0 ? Math.min(100, (mrrNet / mrrTarget) * 100) : 0;

    // Average ticket líquido e customers needed
    const averageTicket = activeUsersCount > 0 ? mrrNet / activeUsersCount : 0;
    const customersNeeded = averageTicket > 0 ? Math.ceil(gapToTarget / averageTicket) : 0;

    // Estimate months to target using expected churn rate
    const grossGrowthRate = 0.10; // 10% monthly growth assumption
    const { expectedChurnRate = 0.05 } = financialConfig;
    const netGrowthRate = grossGrowthRate - expectedChurnRate;
    const estimatedMonthlyGrowth = mrrNet * Math.max(0.01, netGrowthRate);
    const monthsToTarget = estimatedMonthlyGrowth > 0 && gapToTarget > 0 && mrrNet > 0
      ? Math.ceil(Math.log(mrrTarget / mrrNet) / Math.log(1 + netGrowthRate)) 
      : gapToTarget > 0 ? 999 : 0;

    return {
      conversionRate: Number(conversionRate.toFixed(2)),
      retentionRate: Number(retentionRate.toFixed(2)),
      churnRate: Number(churnRate.toFixed(2)),
      ltv: Number(ltv.toFixed(2)),
      cac: Number(cac.toFixed(2)),
      mrr: Number(mrr.toFixed(2)),
      arr: Number(arr.toFixed(2)),
      activeUsers: activeUsersCount,
      totalUsers: totalUsers || 0,
      // Financial metrics - 4 níveis
      mrrAfterGateway: Number(mrrAfterGateway.toFixed(2)),
      mrrAfterCommission: Number(mrrAfterCommission.toFixed(2)),
      mrrNet: Number(mrrNet.toFixed(2)),
      arrAfterGateway: Number(arrAfterGateway.toFixed(2)),
      arrAfterCommission: Number(arrAfterCommission.toFixed(2)),
      arrNet: Number(arrNet.toFixed(2)),
      // Breakdown das taxas
      gatewayFeeAmount: Number(gatewayFeeAmount.toFixed(2)),
      salesCommissionAmount: Number(salesCommissionAmount.toFixed(2)),
      operationalTaxAmount: Number(operationalTaxAmount.toFixed(2)),
      totalFeesAmount: Number(totalFeesAmount.toFixed(2)),
      // Legacy
      commissionAmount: Number(commissionAmount.toFixed(2)),
      // Metas
      mrrTarget,
      arrTarget,
      gapToTarget: Number(gapToTarget.toFixed(2)),
      targetProgress: Number(targetProgress.toFixed(1)),
      customersNeeded,
      monthsToTarget,
      averageTicket: Number(averageTicket.toFixed(2))
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
      totalUsers: 0,
      mrrAfterGateway: 0,
      mrrAfterCommission: 0,
      mrrNet: 0,
      arrAfterGateway: 0,
      arrAfterCommission: 0,
      arrNet: 0,
      gatewayFeeAmount: 0,
      salesCommissionAmount: 0,
      operationalTaxAmount: 0,
      totalFeesAmount: 0,
      commissionAmount: 0,
      mrrTarget: 0,
      arrTarget: 0,
      gapToTarget: 0,
      targetProgress: 0,
      customersNeeded: 0,
      monthsToTarget: 0,
      averageTicket: 0
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
    
    // Fetch dynamic plan prices from database
    const planPrices = await getPlanPrices();
    
    // Fetch all active subscriptions with expiration dates
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        user_id,
        plan_name,
        current_period_end,
        status,
        amount_paid
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
      
      // Usar amount_paid se disponível, senão usar preço do plano
      const actualValue = sub.amount_paid && sub.amount_paid > 0 ? sub.amount_paid : plan.price;
      const monthlyValue = plan.interval === 'yearly' ? actualValue / 12 : actualValue;
      const profile = profileMap.get(sub.user_id);

      return {
        userId: sub.user_id,
        userName: profile?.nome || 'Usuário',
        userEmail: emailMap.get(sub.user_id) || '',
        planName: sub.plan_name,
        expiresAt: expiresAt?.toISOString() || '',
        daysUntilExpiry,
        monthlyValue: actualValue // Use actual value for renewal
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
    
    // Fetch dynamic plan prices from database
    const planPrices = await getPlanPrices();

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);

      // Fetch subscriptions created in this month (incluir amount_paid)
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('plan_name, created_at, amount_paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('plan_name', 'eq', 'Gratuito');

      const planBreakdown: { [plan: string]: { count: number; revenue: number } } = {};
      let totalRevenue = 0;

      (subscriptions || []).forEach(sub => {
        const plan = planPrices[sub.plan_name] || { price: 0 };
        // Usar amount_paid se disponível, senão usar preço do plano
        const actualPrice = sub.amount_paid && sub.amount_paid > 0 ? sub.amount_paid : plan.price;
        
        if (!planBreakdown[sub.plan_name]) {
          planBreakdown[sub.plan_name] = { count: 0, revenue: 0 };
        }
        planBreakdown[sub.plan_name].count++;
        planBreakdown[sub.plan_name].revenue += actualPrice;
        totalRevenue += actualPrice;
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

// ============= PAGAR.ME METRICS FROM SNAPSHOTS =============

export interface PagarmeMetrics {
  // Current Month Metrics (from snapshot)
  mrr: number;
  mrrNet: number;
  arr: number;
  arrNet: number;
  tpv: number;
  chargesCreated: number;
  grossRevenue: number;
  gatewayFees: number;
  averageTicket: number;
  paidChargesCount: number;
  chargesCount: number;
  availableBalance: number;
  waitingFunds: number;
  
  // Calculated Metrics (from historical data)
  conversionRate: number;
  retentionRate: number;
  churnRate: number;
  ltv: number;
  
  // Automatic Targets (based on growth)
  avgMonthlyGrowth: number;
  suggestedMrrTarget: number;
  suggestedArrTarget: number;
  suggestedChurnTarget: number;
  projectedMrr6Months: number;
  projectedMrr12Months: number;
  monthsToDouble: number;
  
  // Target Progress (using overrides if set)
  targetMrr: number;
  gapToTarget: number;
  targetProgress: number;
  monthsToTarget: number;
  
  // Historical context
  lastMonthMrr: number;
  monthOverMonthGrowth: number;
  bestMonth: { month: string; mrr: number };
  worstMonth: { month: string; mrr: number };
}

interface SnapshotData {
  reference_month: string;
  gross_revenue: number;
  net_revenue: number;
  gateway_fees: number;
  tpv: number;
  average_ticket: number;
  paid_charges_count: number;
  charges_count: number;
  available_balance: number;
  waiting_funds: number;
}

export async function calculateMetricsFromPagarme(
  currentSnapshot: SnapshotData | null,
  salesCommissionPercent: number = 0.10,
  targetOverride?: { mrrTarget?: number; churnTarget?: number }
): Promise<PagarmeMetrics> {
  try {
    // Return empty metrics if no data
    if (!currentSnapshot) {
      return getEmptyPagarmeMetrics();
    }

    // Fetch last 12 months of snapshots
    const { data: snapshots, error } = await supabase
      .from('financial_snapshots')
      .select('reference_month, gross_revenue, net_revenue, gateway_fees, tpv, average_ticket, paid_charges_count, charges_count')
      .eq('source', 'pagarme')
      .order('reference_month', { ascending: false })
      .limit(12);

    if (error) {
      console.error('Error fetching historical snapshots:', error);
      // Continue with current snapshot only
    }

    const historicalSnapshots = (snapshots || []) as SnapshotData[];
    
    // Current month data
    const current = currentSnapshot || (historicalSnapshots.length > 0 ? historicalSnapshots[0] : null);
    
    if (!current) {
      return getEmptyPagarmeMetrics();
    }

    // Calculate MRR (gross revenue = what customer pays in the month)
    const mrr = current.gross_revenue || 0;
    const gatewayFees = current.gateway_fees || 0;
    const mrrAfterGateway = mrr - gatewayFees;
    const salesCommission = mrrAfterGateway * salesCommissionPercent;
    const mrrNet = mrrAfterGateway - salesCommission;
    const arr = mrr * 12;
    const arrNet = mrrNet * 12;

    // Get user metrics for conversion/retention
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('status', ['active', 'trialing'])
      .not('plan_name', 'in', '("Gratuito","free")');

    const activePayingUsers = activeSubscriptions?.length || 0;
    const conversionRate = totalUsers ? (activePayingUsers / totalUsers) * 100 : 0;

    // Calculate churn and retention from historical data
    let churnRate = 5; // Default 5%
    let retentionRate = 95;
    let avgMonthlyGrowth = 0;
    let lastMonthMrr = 0;
    let monthOverMonthGrowth = 0;
    let bestMonth = { month: current.reference_month, mrr: mrr };
    let worstMonth = { month: current.reference_month, mrr: mrr };

    if (historicalSnapshots.length >= 2) {
      // Calculate growth rates
      const growthRates: number[] = [];
      
      for (let i = 0; i < historicalSnapshots.length - 1; i++) {
        const currentMonth = historicalSnapshots[i];
        const prevMonth = historicalSnapshots[i + 1];
        
        if (prevMonth.gross_revenue > 0) {
          const growth = ((currentMonth.gross_revenue - prevMonth.gross_revenue) / prevMonth.gross_revenue) * 100;
          growthRates.push(growth);
        }

        // Track best/worst months
        if (currentMonth.gross_revenue > bestMonth.mrr) {
          bestMonth = { month: currentMonth.reference_month, mrr: currentMonth.gross_revenue };
        }
        if (currentMonth.gross_revenue < worstMonth.mrr && currentMonth.gross_revenue > 0) {
          worstMonth = { month: currentMonth.reference_month, mrr: currentMonth.gross_revenue };
        }
      }

      if (growthRates.length > 0) {
        avgMonthlyGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
        monthOverMonthGrowth = growthRates[0] || 0;
      }

      lastMonthMrr = historicalSnapshots[1]?.gross_revenue || 0;

      // Estimate churn based on revenue decline months
      const declineMonths = growthRates.filter(g => g < 0);
      if (declineMonths.length > 0) {
        churnRate = Math.abs(declineMonths.reduce((a, b) => a + b, 0) / declineMonths.length);
      } else {
        churnRate = 3; // Low churn if no decline months
      }
      retentionRate = 100 - churnRate;
    }

    // LTV calculation
    const churnDecimal = Math.max(0.01, churnRate / 100);
    const avgTicket = current.average_ticket || (mrr / Math.max(1, activePayingUsers));
    const ltv = avgTicket * (1 / churnDecimal);

    // Automatic targets based on growth
    const growthDecimal = avgMonthlyGrowth / 100;
    const projectedMrr6Months = mrr * Math.pow(1 + Math.max(0, growthDecimal), 6);
    const projectedMrr12Months = mrr * Math.pow(1 + Math.max(0, growthDecimal), 12);
    const suggestedMrrTarget = projectedMrr12Months;
    const suggestedArrTarget = suggestedMrrTarget * 12;
    const suggestedChurnTarget = Math.max(2, churnRate * 0.8); // 20% better than current
    
    // Months to double
    const monthsToDouble = growthDecimal > 0 
      ? Math.ceil(Math.log(2) / Math.log(1 + growthDecimal))
      : 999;

    // Target progress (use override if provided)
    const targetMrr = targetOverride?.mrrTarget || suggestedMrrTarget;
    const gapToTarget = Math.max(0, targetMrr - mrrNet);
    const targetProgress = targetMrr > 0 ? Math.min(100, (mrrNet / targetMrr) * 100) : 0;
    
    // Months to target
    const monthsToTarget = growthDecimal > 0 && gapToTarget > 0 && mrrNet > 0
      ? Math.ceil(Math.log(targetMrr / mrrNet) / Math.log(1 + growthDecimal))
      : gapToTarget > 0 ? 999 : 0;

    return {
      mrr: Number(mrr.toFixed(2)),
      mrrNet: Number(mrrNet.toFixed(2)),
      arr: Number(arr.toFixed(2)),
      arrNet: Number(arrNet.toFixed(2)),
      tpv: Number((current.tpv || 0).toFixed(2)),
      chargesCreated: current.charges_count || 0,
      grossRevenue: Number(mrr.toFixed(2)),
      gatewayFees: Number(gatewayFees.toFixed(2)),
      averageTicket: Number((current.average_ticket || avgTicket).toFixed(2)),
      paidChargesCount: current.paid_charges_count || 0,
      chargesCount: current.charges_count || 0,
      availableBalance: Number((current.available_balance || 0).toFixed(2)),
      waitingFunds: Number((current.waiting_funds || 0).toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(2)),
      retentionRate: Number(retentionRate.toFixed(2)),
      churnRate: Number(churnRate.toFixed(2)),
      ltv: Number(ltv.toFixed(2)),
      avgMonthlyGrowth: Number(avgMonthlyGrowth.toFixed(2)),
      suggestedMrrTarget: Number(suggestedMrrTarget.toFixed(2)),
      suggestedArrTarget: Number(suggestedArrTarget.toFixed(2)),
      suggestedChurnTarget: Number(suggestedChurnTarget.toFixed(2)),
      projectedMrr6Months: Number(projectedMrr6Months.toFixed(2)),
      projectedMrr12Months: Number(projectedMrr12Months.toFixed(2)),
      monthsToDouble,
      targetMrr: Number(targetMrr.toFixed(2)),
      gapToTarget: Number(gapToTarget.toFixed(2)),
      targetProgress: Number(targetProgress.toFixed(1)),
      monthsToTarget,
      lastMonthMrr: Number(lastMonthMrr.toFixed(2)),
      monthOverMonthGrowth: Number(monthOverMonthGrowth.toFixed(2)),
      bestMonth,
      worstMonth,
    };
  } catch (error) {
    console.error('Error calculating Pagar.me metrics:', error);
    return getEmptyPagarmeMetrics();
  }
}

function getEmptyPagarmeMetrics(): PagarmeMetrics {
  return {
    mrr: 0,
    mrrNet: 0,
    arr: 0,
    arrNet: 0,
    tpv: 0,
    chargesCreated: 0,
    grossRevenue: 0,
    gatewayFees: 0,
    averageTicket: 0,
    paidChargesCount: 0,
    chargesCount: 0,
    availableBalance: 0,
    waitingFunds: 0,
    conversionRate: 0,
    retentionRate: 0,
    churnRate: 0,
    ltv: 0,
    avgMonthlyGrowth: 0,
    suggestedMrrTarget: 0,
    suggestedArrTarget: 0,
    suggestedChurnTarget: 0,
    projectedMrr6Months: 0,
    projectedMrr12Months: 0,
    monthsToDouble: 999,
    targetMrr: 0,
    gapToTarget: 0,
    targetProgress: 0,
    monthsToTarget: 999,
    lastMonthMrr: 0,
    monthOverMonthGrowth: 0,
    bestMonth: { month: '', mrr: 0 },
    worstMonth: { month: '', mrr: 0 },
  };
}
