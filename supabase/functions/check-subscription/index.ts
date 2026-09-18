import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      // Treat missing auth as "free" instead of a server error so the app never breaks
      logStep("No authorization header - returning free status");
      return new Response(JSON.stringify({
        subscribed: false,
        status: "free",
        plan_name: "Gratuito",
        session_expired: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Validate token is not empty or "undefined" string
    if (!token || token === "undefined" || token === "null" || token.trim() === "") {
      logStep("ERROR: Invalid token", { token: token?.substring(0, 20) });
      return new Response(JSON.stringify({
        error: "Invalid authentication token",
        code: 401
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Cliente para validar usuário (usa ANON_KEY com token)
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    logStep("Validating token");
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError) {
      logStep("Session expired or invalid", { error: userError.message });
      // Return 200 with free status so the client won't treat it as a hard error
      return new Response(JSON.stringify({
        subscribed: false,
        status: "free",
        plan_name: "Gratuito",
        session_expired: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    if (!user?.email) {
      logStep("No user or email found");
      return new Response(JSON.stringify({
        subscribed: false,
        status: 'free',
        plan_name: 'Gratuito',
        error: 'User not authenticated',
        code: 401
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Cliente admin para operações no banco (usa SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: localSub, error: localError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (localError) {
      logStep("ERROR checking local subscription", { error: localError });
    }

    // Se a assinatura é via GURU, usar os dados locais (única fonte de verdade -
    // não há sincronização com API externa, o webhook do Guru já mantém isso
    // atualizado).
    if (localSub && localSub.payment_gateway === 'guru') {
      logStep("Assinatura via GURU detectada - usando dados locais", {
        status: localSub.status,
        plan: localSub.plan_name,
        guru_subscription_id: localSub.guru_subscription_id
      });

      const isActive = localSub.status === 'active' || localSub.status === 'trialing';

      // Verificar se o período expirou
      if (localSub.current_period_end) {
        const periodEnd = new Date(localSub.current_period_end);
        const now = new Date();

        if (periodEnd < now && localSub.status === 'active') {
          // Buscar período de graça configurado
          const { data: graceSetting } = await supabaseAdmin
            .from('app_settings')
            .select('value')
            .eq('key', 'subscription_grace_period_days')
            .maybeSingle();

          const graceDays = graceSetting?.value ? parseInt(graceSetting.value) : 0;
          const graceEnd = new Date(periodEnd.getTime() + graceDays * 24 * 60 * 60 * 1000);

          if (now > graceEnd) {
            logStep("Período GURU expirado + graça ultrapassada, expirando assinatura", {
              periodEnd: localSub.current_period_end,
              graceDays,
              graceEnd: graceEnd.toISOString(),
              now: now.toISOString()
            });

            await supabaseAdmin
              .from('subscriptions')
              .update({
                status: 'expired',
                plan_name: 'Gratuito',
                updated_at: now.toISOString()
              })
              .eq('user_id', user.id);

            return new Response(JSON.stringify({
              subscribed: false,
              status: 'expired',
              plan_name: 'Gratuito',
              message: 'Período de assinatura expirado',
              payment_gateway: 'guru',
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          } else {
            logStep("Período GURU expirado mas dentro do período de graça", {
              periodEnd: localSub.current_period_end,
              graceDays,
              graceEnd: graceEnd.toISOString()
            });
          }
        }
      }

      return new Response(JSON.stringify({
        subscribed: isActive,
        status: localSub.status,
        plan_name: localSub.plan_name,
        current_period_end: localSub.current_period_end,
        payment_gateway: 'guru',
        guru_subscription_id: localSub.guru_subscription_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Sem gateway de pagamento (ou pagamento gerenciado fora do fluxo Guru):
    // só existe uma fonte de verdade agora, o registro local. Isso cobre acesso
    // complementar concedido pelo admin (sem nenhum gateway de pagamento
    // vinculado).
    if (localSub && localSub.status === 'active' && localSub.current_period_end) {
      const validUntil = new Date(localSub.current_period_end);
      const now = new Date();

      if (validUntil > now) {
        logStep("Assinatura local válida (complementar)", {
          plan: localSub.plan_name,
          validUntil: localSub.current_period_end,
        });

        return new Response(JSON.stringify({
          subscribed: true,
          status: 'active',
          plan_name: localSub.plan_name,
          current_period_end: localSub.current_period_end,
          is_complimentary: !localSub.guru_subscription_id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Assinatura local expirada", {
        plan: localSub.plan_name,
        expiredAt: localSub.current_period_end,
      });
    }

    logStep("Nenhuma assinatura válida encontrada, atualizando para gratuito");

    const { data: existingData } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingData) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'free',
          plan_name: 'Gratuito',
          current_period_end: null,
        })
        .eq('user_id', user.id);
    } else {
      await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          status: 'free',
          plan_name: 'Gratuito',
          current_period_end: null,
        });
    }

    return new Response(JSON.stringify({
      subscribed: false,
      status: 'free',
      plan_name: 'Gratuito'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
