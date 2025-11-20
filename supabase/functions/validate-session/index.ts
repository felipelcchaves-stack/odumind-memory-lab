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
    console.log("[VALIDATE-SESSION] Decoding token");
    
    // Decode the JWT token without validating it (in case it's expired)
    // We just need the user_id from it
    let userId: string;
    let tokenExp: number;
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error("Invalid token format");
      }
      const payload = JSON.parse(atob(tokenParts[1]));
      userId = payload.sub;
      tokenExp = payload.exp;
      
      if (!userId) {
        throw new Error("No user ID in token");
      }
      
      console.log(`[VALIDATE-SESSION] Extracted user ID: ${userId}, exp: ${tokenExp}`);
      
      // Check if token is expired by more than 1 hour
      const now = Math.floor(Date.now() / 1000);
      const oneHourAgo = now - 3600;
      
      if (tokenExp < oneHourAgo) {
        console.log("[VALIDATE-SESSION] Token expired by more than 1 hour, returning invalid session");
        return new Response(
          JSON.stringify({ valid: false, reason: "token_expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    } catch (decodeError) {
      console.error("[VALIDATE-SESSION] Error decoding token:", decodeError);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

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
      .eq("user_id", userId)
      .single();

    if (sessionError || !activeSession) {
      console.log(`[VALIDATE-SESSION] Nenhuma sessão encontrada para user ${userId}`);
      return new Response(
        JSON.stringify({ valid: false, reason: "no_session" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o session_id enviado pelo cliente corresponde ao armazenado
    const isValid = activeSession.session_id === session_id;

    if (!isValid) {
      console.log(`[VALIDATE-SESSION] Sessão inválida para user ${userId}. Esperado: ${activeSession.session_id}, Recebido: ${session_id}`);
      return new Response(
        JSON.stringify({ valid: false, reason: "session_mismatch" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar last_activity
    await supabaseClient
      .from("active_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("user_id", userId);

    console.log(`[VALIDATE-SESSION] Sessão válida para user ${userId}`);
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
