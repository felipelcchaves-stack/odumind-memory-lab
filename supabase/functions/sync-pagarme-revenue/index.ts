import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BalanceOperation {
  id: string;
  status: string;
  amount: number;
  fee: number;
  type: string;
  created_at: string;
  movement_object?: {
    payment_method?: {
      type?: string;
    };
    transaction?: {
      id?: string;
      amount?: number;
    };
  };
}

interface PagarmeResponse {
  data: BalanceOperation[];
  paging?: {
    next?: string;
    previous?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
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
    
    // Default to current month if not specified
    const targetMonth = referenceMonth || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    
    console.log(`Syncing Pagar.me data for month: ${targetMonth}`);

    // Calculate date range for the month
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // Fetch balance operations from Pagar.me API
    const authString = btoa(`${pagarmeSecretKey}:`);
    
    let allOperations: BalanceOperation[] = [];
    let nextCursor: string | null = null;
    let page = 1;
    const maxPages = 50; // Safety limit

    do {
      const url = new URL('https://api.pagar.me/core/v5/balance/operations');
      url.searchParams.set('created_since', startDate.toISOString());
      url.searchParams.set('created_until', endDate.toISOString());
      url.searchParams.set('size', '100');
      if (nextCursor) {
        url.searchParams.set('cursor', nextCursor);
      }

      console.log(`Fetching page ${page}: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pagar.me API error:', response.status, errorText);
        return new Response(
          JSON.stringify({ 
            error: `Erro na API Pagar.me: ${response.status}`,
            details: errorText 
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data: PagarmeResponse = await response.json();
      console.log(`Page ${page}: Found ${data.data?.length || 0} operations`);
      
      if (data.data && data.data.length > 0) {
        allOperations = [...allOperations, ...data.data];
      }

      // Check for next page
      nextCursor = data.paging?.next ? data.paging.next.split('cursor=')[1]?.split('&')[0] : null;
      page++;

    } while (nextCursor && page <= maxPages);

    console.log(`Total operations fetched: ${allOperations.length}`);

    // Process operations to calculate totals
    let grossRevenue = 0;
    let totalFees = 0;
    let netRevenue = 0;
    let transactionCount = 0;

    for (const op of allOperations) {
      // Only count credit operations (incoming money)
      if (op.type === 'payable' && op.status === 'available') {
        grossRevenue += op.amount || 0;
        totalFees += op.fee || 0;
        transactionCount++;
      }
    }

    // Convert from cents to reais
    grossRevenue = grossRevenue / 100;
    totalFees = totalFees / 100;
    netRevenue = grossRevenue - totalFees;

    console.log(`Calculated totals - Gross: ${grossRevenue}, Fees: ${totalFees}, Net: ${netRevenue}, Transactions: ${transactionCount}`);

    // Upsert the snapshot in database
    const { data: snapshot, error: upsertError } = await supabase
      .from('financial_snapshots')
      .upsert({
        reference_month: targetMonth,
        gross_revenue: grossRevenue,
        gateway_fees: totalFees,
        sales_commission: 0, // Will be calculated on frontend based on settings
        net_revenue: netRevenue,
        transaction_count: transactionCount,
        synced_at: new Date().toISOString(),
        source: 'pagarme',
        raw_data: {
          total_operations: allOperations.length,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          summary: {
            gross_revenue: grossRevenue,
            gateway_fees: totalFees,
            net_revenue: netRevenue,
            transaction_count: transactionCount,
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
          grossRevenue,
          gatewayFees: totalFees,
          netRevenue,
          transactionCount,
          syncedAt: snapshot.synced_at,
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
