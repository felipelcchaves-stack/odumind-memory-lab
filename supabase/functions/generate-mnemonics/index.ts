import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[generate-mnemonics] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login para continuar." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o token é válido
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("[generate-mnemonics] Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-mnemonics] Authenticated user: ${user.id}`);

    const { oduNome, oduNumero, significado, verso } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const prompt = `Você é um especialista em técnicas de memorização e cultura Yorubá.

Crie 5 mnemônicos diferentes para ajudar a memorizar o seguinte Odu:

Nome: ${oduNome}
Número: ${oduNumero}
Significado: ${significado || 'Não fornecido'}
Verso: ${verso || 'Não fornecido'}

Gere os seguintes tipos de mnemônicos:
1. Um ACRÔNIMO criativo usando as letras do nome
2. Uma FRASE mnemônica memorável
3. Uma RIMA curta e fácil de lembrar
4. Uma ASSOCIAÇÃO visual ou conceitual
5. Uma IMAGEM MENTAL vívida e marcante

Retorne APENAS um objeto JSON válido neste formato exato:
{
  "acronimo": "texto do acrônimo aqui",
  "frase": "texto da frase aqui",
  "rima": "texto da rima aqui",
  "associacao": "texto da associação aqui",
  "imagem": "texto da imagem mental aqui"
}

Não inclua nenhum texto adicional, apenas o JSON.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        messages: [
          { role: "system", content: "Você é um especialista em técnicas de memorização. Sempre responda apenas com JSON válido." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos para continuar usando IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao comunicar com o serviço de IA");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON response
    let mnemonics;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      mnemonics = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Erro ao processar resposta da IA");
    }

    console.log(`[generate-mnemonics] Successfully generated mnemonics for user ${user.id}`);

    return new Response(JSON.stringify({ mnemonics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-mnemonics function:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
