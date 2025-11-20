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
    // Verificar se o header Authorization existe
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      console.error("[VALIDATE-SESSION] Authorization header não encontrado");
      return new Response(
        JSON.stringify({ error: "Authorization header não fornecido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

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

    const token = authHeader.replace("Bearer ", "");
    console.log("[VALIDATE-SESSION] Validando token do usuário");
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError) {
      console.error("[VALIDATE-SESSION] Erro ao validar usuário:", userError.message);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    if (!user) {
      console.error("[VALIDATE-SESSION] Usuário não encontrado");
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log(`[VALIDATE-SESSION] Usuário autenticado: ${user.id}`);

    const { session_id } = await req.json();

    if (!session_id) {
      console.error("[VALIDATE-SESSION] session_id não fornecido no body");
      return new Response(
        JSON.stringify({ error: "session_id não fornecido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
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

    console.log(`[VALIDATE-SESSION] Sessão válida para user ${user.id}`);
    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[VALIDATE-SESSION] Erro não tratado:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
