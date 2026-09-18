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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
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

    console.log('Sending request to Gemini...');

    // Gemini's image-generation models use the Interactions API, not the
    // OpenAI-compatible chat/completions endpoint used by the text-only
    // functions - it returns base64 image data directly rather than a URL.
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-image",
        input: [
          { type: "text", text: prompt }
        ],
        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: "16:9"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error:', errorText);
      throw new Error(`Gemini request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini response received');

    // Extract the generated image (base64) and turn it into a data URL so
    // callers can keep using imageUrl exactly as before.
    const imageData = data.output_image?.data;
    const imageMimeType = data.output_image?.mime_type || 'image/jpeg';

    if (!imageData) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated in response');
    }

    const imageUrl = `data:${imageMimeType};base64,${imageData}`;

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
