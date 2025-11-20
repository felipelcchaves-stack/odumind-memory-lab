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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error("session_id não fornecido");
    }

    // Buscar sessão ativa do usuário
    const { data: activeSession, error: sessionError } = await supabaseClient
      .from("active_sessions")
      .select("session_id")
      .eq("user_id", user.id)
      .single();

    if (sessionError || !activeSession) {
      console.log(`[VALIDATE-SESSION] Nenhuma sessão encontrada para user ${user.id}`);
      return new Response(
        JSON.stringify({ valid: false, reason: "no_session" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o session_id enviado pelo cliente corresponde ao armazenado
    const isValid = activeSession.session_id === session_id;

    if (!isValid) {
      console.log(`[VALIDATE-SESSION] Sessão inválida para user ${user.id}. Esperado: ${activeSession.session_id}, Recebido: ${session_id}`);
      return new Response(
        JSON.stringify({ valid: false, reason: "session_mismatch" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar last_activity
    await supabaseClient
      .from("active_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[VALIDATE-SESSION] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
