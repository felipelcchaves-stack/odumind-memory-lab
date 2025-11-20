import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key to bypass RLS for session management
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    const { device_info, ip_address } = await req.json();

    // Gerar novo session_id único
    const newSessionId = crypto.randomUUID();

    // Deletar sessão anterior do usuário (força logout em outros dispositivos)
    const { error: deleteError } = await supabaseClient
      .from("active_sessions")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Erro ao deletar sessão anterior:", deleteError);
    }

    // Criar nova sessão
    const { error: insertError } = await supabaseClient
      .from("active_sessions")
      .insert({
        user_id: user.id,
        session_id: newSessionId,
        device_info,
        ip_address,
        last_activity: new Date().toISOString(),
      });

    if (insertError) {
      throw new Error(`Erro ao criar sessão: ${insertError.message}`);
    }

    console.log(`[ENFORCE-SESSION] Nova sessão criada para user ${user.id}: ${newSessionId}`);

    return new Response(
      JSON.stringify({ session_id: newSessionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ENFORCE-SESSION] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
