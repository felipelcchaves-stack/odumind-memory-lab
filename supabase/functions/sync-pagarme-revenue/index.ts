import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Isesemind product IDs for filtering (supports multiple products/plans)
const ISESEMIND_PRODUCT_IDS = [
  'a0734b00-ff78-47ed-8516-0bc2aae38f64', // Plano original R$97
  // Adicione aqui novos product_ids quando criar novos planos (ex: R$129)
];

interface Charge {
  id: string;
  status: string;
  amount: number;
  paid_amount: number;
  created_at: string;
  paid_at?: string;
  gateway_id?: string;
  metadata?: Record<string, string>;
  last_transaction?: {
    gateway_response?: {
      code?: string;
    };
  };
}

interface BalanceResponse {
  available_amount: number;
  waiting_funds: {
    amount: number;
  };
  transferred_amount: number;
}

interface PagarmeListResponse<T> {
  data: T[];
  paging?: {
    next?: string;
    previous?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY');
    if (!pagarmeSecretKey) {
      console.error('PAGARME_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key da Pagar.me não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Cliente admin (banco) - não depende de sessão
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[SYNC-PAGARME] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[SYNC-PAGARME] Token received, length:', token.length);

    // Cliente de auth usando ANON + header (evita "Auth session missing" em ambientes serverless)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError) {
      console.log('[SYNC-PAGARME] Auth error:', authError.message);
      return new Response(
        JSON.stringify({ error: 'Erro de autenticação: ' + authError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.log('[SYNC-PAGARME] No user found');
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SYNC-PAGARME] User authenticated:', user.id, user.email);

    // Check if user is admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas admins podem sincronizar.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { referenceMonth } = await req.json();
    const targetMonth = referenceMonth || new Date().toISOString().slice(0, 7);
    
    console.log(`Syncing Pagar.me data for month: ${targetMonth} (filtered by Isesemind product)`);

    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const authString = btoa(`${pagarmeSecretKey}:`);
    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // ========== 1. FETCH ALL CHARGES ==========
    console.log('Fetching charges...');
    let allCharges: Charge[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 100) {
      const chargesUrl = new URL('https://api.pagar.me/core/v5/charges');
      chargesUrl.searchParams.set('created_since', startDate.toISOString());
      chargesUrl.searchParams.set('created_until', endDate.toISOString());
      chargesUrl.searchParams.set('size', '100');
      chargesUrl.searchParams.set('page', String(page));

      console.log(`Fetching charges page ${page}: ${chargesUrl.toString()}`);

      const chargesResponse = await fetch(chargesUrl.toString(), { method: 'GET', headers });

      if (!chargesResponse.ok) {
        const errorText = await chargesResponse.text();
        console.error('Pagar.me charges API error:', chargesResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: `Erro na API Pagar.me (charges): ${chargesResponse.status}`, details: errorText }),
          { status: chargesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const chargesData: PagarmeListResponse<Charge> = await chargesResponse.json();
      const chargesFound = chargesData.data?.length || 0;
      const hasNextPage = !!chargesData.paging?.next;
      
      console.log(`Page ${page}: Found ${chargesFound} charges, has_next: ${hasNextPage}`);

      if (chargesData.data && chargesData.data.length > 0) {
        allCharges = [...allCharges, ...chargesData.data];
        page++;
        
        hasMore = hasNextPage || chargesData.data.length >= 30;
        
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`Total charges fetched: ${allCharges.length}`);

    // ========== DIAGNOSTIC LOGS ==========
    // Log sample charges to understand structure and find product_id location
    if (allCharges.length > 0) {
      const sampleCharges = allCharges.slice(0, 5).map((charge: any) => ({
        id: charge.id,
        amount: charge.amount / 100,
        status: charge.status,
        recurrence_cycle: charge.recurrence_cycle,
        invoice: charge.invoice ? {
          id: charge.invoice.id,
          subscription: charge.invoice.subscription ? {
            id: charge.invoice.subscription.id,
            plan: charge.invoice.subscription.plan ? {
              id: charge.invoice.subscription.plan.id,
              name: charge.invoice.subscription.plan.name,
              items: charge.invoice.subscription.plan.items?.map((item: any) => ({
                id: item.id,
                name: item.name,
                product_id: item.product_id,
              })),
            } : null,
          } : null,
        } : null,
        items: charge.items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          product_id: item.product_id,
          description: item.description,
        })),
        metadata: charge.metadata,
        customer: charge.customer ? { id: charge.customer.id, name: charge.customer.name } : null,
      }));
      console.log('[DIAGNOSTIC] Sample charges structure:', JSON.stringify(sampleCharges, null, 2));
    }

    // ========== 2. FILTER BY PRODUCT_ID (Isesemind specific) ==========
    // Filtrar apenas cobranças do produto Isesemind usando os product_ids configurados
    console.log(`[CONFIG] Isesemind Product IDs: ${ISESEMIND_PRODUCT_IDS.join(', ')}`);
    
    const isesemindCharges = allCharges.filter((charge: any) => {
      // Deve ser uma cobrança de assinatura (recurrence_cycle presente)
      if (!charge.recurrence_cycle) return false;

      // Verificar product_id em diferentes locais possíveis:
      
      // 1. No invoice -> subscription -> plan -> items
      const planItems = charge.invoice?.subscription?.plan?.items || [];
      const hasPlanProduct = planItems.some((item: any) => 
        ISESEMIND_PRODUCT_IDS.includes(item.product_id)
      );
      if (hasPlanProduct) return true;

      // 2. Nos items da cobrança diretamente
      const chargeItems = charge.items || [];
      const hasChargeProduct = chargeItems.some((item: any) => 
        ISESEMIND_PRODUCT_IDS.includes(item.product_id)
      );
      if (hasChargeProduct) return true;

      // 3. No metadata
      if (ISESEMIND_PRODUCT_IDS.includes(charge.metadata?.product_id)) return true;

      return false;
    });

    // Log para debug: cobranças com recurrence_cycle mas sem product_id Isesemind
    const subscriptionChargesTotal = allCharges.filter((c: any) => c.recurrence_cycle).length;
    const nonIsesemindSubscriptions = subscriptionChargesTotal - isesemindCharges.length;
    
    console.log(`[FILTER] Total charges: ${allCharges.length}`);
    console.log(`[FILTER] Subscription charges (with recurrence_cycle): ${subscriptionChargesTotal}`);
    console.log(`[FILTER] Isesemind charges (product_id match): ${isesemindCharges.length}`);
    console.log(`[FILTER] Other subscription charges (NOT Isesemind): ${nonIsesemindSubscriptions}`);
    
    // Log charges by status for debugging
    const statusCounts = isesemindCharges.reduce((acc, charge) => {
      acc[charge.status] = (acc[charge.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[FILTER] Isesemind charges by status:', JSON.stringify(statusCounts));

    // ========== 3. FETCH CURRENT BALANCE ==========
    console.log('Fetching balance...');
    let balanceData: BalanceResponse | null = null;

    try {
      const balanceResponse = await fetch('https://api.pagar.me/core/v5/balance', { method: 'GET', headers });
      
      if (balanceResponse.ok) {
        balanceData = await balanceResponse.json();
        console.log('Balance fetched:', balanceData);
      } else {
        console.warn('Could not fetch balance:', await balanceResponse.text());
      }
    } catch (balanceError) {
      console.warn('Error fetching balance:', balanceError);
    }

    // ========== 4. CALCULATE METRICS (ISESEMIND ONLY) ==========
    let chargesCreated = 0;      // All Isesemind charges amount
    let tpv = 0;                 // Authorized/paid Isesemind charges (TPV)
    let totalPaidAmount = 0;     // Actually paid amount
    let chargesCount = 0;        // Total Isesemind charges count
    let paidChargesCount = 0;    // Paid Isesemind charges count

    for (const charge of isesemindCharges) {
      chargesCount++;
      chargesCreated += (charge.amount || 0);

      // TPV = paid, captured, or pending charges (authorized)
      if (['paid', 'captured', 'pending'].includes(charge.status)) {
        tpv += (charge.amount || 0);
      }

      // Actually paid
      if (charge.status === 'paid') {
        paidChargesCount++;
        totalPaidAmount += (charge.paid_amount || charge.amount || 0);
      }
    }

    // Convert from cents to reais
    chargesCreated = chargesCreated / 100;
    tpv = tpv / 100;
    totalPaidAmount = totalPaidAmount / 100;

    // Calculate average ticket
    const averageTicket = paidChargesCount > 0 ? totalPaidAmount / paidChargesCount : 0;

    // Balance data (already in reais from API) - Note: this is total balance, not Isesemind-specific
    const availableBalance = balanceData ? (balanceData.available_amount || 0) / 100 : 0;
    const waitingFunds = balanceData?.waiting_funds ? (balanceData.waiting_funds.amount || 0) / 100 : 0;
    const transferredAmount = balanceData ? (balanceData.transferred_amount || 0) / 100 : 0;

    // Estimate gateway fees (approximately 3.5% for card transactions)
    const estimatedGatewayFees = totalPaidAmount * 0.035;
    const netRevenue = totalPaidAmount - estimatedGatewayFees;

    console.log(`Calculated metrics (ISESEMIND ONLY):
      - Charges Created: R$ ${chargesCreated.toFixed(2)}
      - TPV (Authorized): R$ ${tpv.toFixed(2)}
      - Paid Amount: R$ ${totalPaidAmount.toFixed(2)}
      - Average Ticket: R$ ${averageTicket.toFixed(2)}
      - Charges Count: ${chargesCount}
      - Paid Charges: ${paidChargesCount}
      - Available Balance: R$ ${availableBalance.toFixed(2)}
      - Waiting Funds: R$ ${waitingFunds.toFixed(2)}
      - Transferred: R$ ${transferredAmount.toFixed(2)}
      - Estimated Fees: R$ ${estimatedGatewayFees.toFixed(2)}
      - Net Revenue: R$ ${netRevenue.toFixed(2)}
    `);

    // ========== 5. SAVE TO DATABASE ==========
    const { data: snapshot, error: upsertError } = await supabaseAdmin
      .from('financial_snapshots')
      .upsert({
        reference_month: targetMonth,
        gross_revenue: totalPaidAmount,
        gateway_fees: estimatedGatewayFees,
        sales_commission: 0,
        net_revenue: netRevenue,
        transaction_count: paidChargesCount,
        tpv: tpv,
        charges_created: chargesCreated,
        available_balance: availableBalance,
        waiting_funds: waitingFunds,
        transferred_amount: transferredAmount,
        average_ticket: averageTicket,
        charges_count: chargesCount,
        paid_charges_count: paidChargesCount,
        synced_at: new Date().toISOString(),
        source: 'pagarme',
        raw_data: {
          product_filter: ISESEMIND_PRODUCT_IDS,
          total_charges_before_filter: allCharges.length,
          isesemind_charges: isesemindCharges.length,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          balance: balanceData,
          summary: {
            charges_created: chargesCreated,
            tpv: tpv,
            paid_amount: totalPaidAmount,
            average_ticket: averageTicket,
            gateway_fees: estimatedGatewayFees,
            net_revenue: netRevenue,
          }
        },
      }, {
        onConflict: 'reference_month,source',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error saving snapshot:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar snapshot', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Snapshot saved successfully:', snapshot);

    return new Response(
      JSON.stringify({
        success: true,
        snapshot: {
          referenceMonth: targetMonth,
          chargesCreated,
          tpv,
          grossRevenue: totalPaidAmount,
          gatewayFees: estimatedGatewayFees,
          netRevenue,
          averageTicket,
          chargesCount,
          paidChargesCount,
          availableBalance,
          waitingFunds,
          transferredAmount,
          syncedAt: snapshot.synced_at,
          isesemindChargesFiltered: isesemindCharges.length,
          totalChargesBeforeFilter: allCharges.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in sync-pagarme-revenue:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
