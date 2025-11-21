import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titulo, descricao, icone, tipo, valor_conquista } = await req.json();

    console.log('Generating share image for achievement:', { titulo, tipo });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create a detailed prompt for image generation
    const prompt = `Create a beautiful, vibrant social media share image for an achievement badge with these specifications:

ACHIEVEMENT DETAILS:
- Title: "${titulo}"
- Description: "${descricao}"
- Icon/Emoji: ${icone}
- Category: ${tipo}
${valor_conquista > 0 ? `- XP Reward: +${valor_conquista} XP` : ''}

DESIGN REQUIREMENTS:
- Aspect ratio: 1200x630 pixels (Open Graph standard)
- Style: Modern, gradient background with Yoruba/African tribal patterns (subtle)
- Color scheme: Use vibrant colors - teal/green primary with golden/yellow accents
- Layout: 
  * Large emoji/icon ${icone} centered at the top (120px size)
  * Achievement title "${titulo}" in bold white text below the icon
  * Brief description in smaller white text
  ${valor_conquista > 0 ? `* "+${valor_conquista} XP" badge in golden color at bottom right` : ''}
  * Decorative elements: subtle geometric patterns, shine effects
- Background: Gradient from dark teal to deep purple with soft glow effects
- Professional quality, suitable for social media sharing
- Add subtle African tribal patterns in the background
- Include "IseseMind" branding in small text at bottom
- High contrast, readable text`;

    console.log('Sending request to Lovable AI...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`Lovable AI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated in response');
    }

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({ 
        imageUrl,
        message: 'Achievement share image generated successfully'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating achievement share image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate share image';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
