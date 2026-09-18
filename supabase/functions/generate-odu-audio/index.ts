import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação - sem isso, qualquer chamador anônimo poderia
    // disparar gerações pagas na ElevenLabs repetidamente.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado. Faça login para continuar.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authUserError } = await authClient.auth.getUser();
    if (authUserError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { odu_id, audio_type = 'nome' } = await req.json();

    if (!odu_id) {
      throw new Error('odu_id is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if audio already exists in cache
    const { data: existingAudio } = await supabase
      .from('odu_audio')
      .select('audio_url')
      .eq('odu_id', odu_id)
      .eq('audio_type', audio_type)
      .single();

    if (existingAudio?.audio_url) {
      console.log('Audio found in cache:', existingAudio.audio_url);
      return new Response(
        JSON.stringify({ audio_url: existingAudio.audio_url, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Odu data
    const { data: odu, error: oduError } = await supabase
      .from('odu')
      .select('nome, verso_resumido, texto_principal')
      .eq('id', odu_id)
      .single();

    if (oduError || !odu) {
      throw new Error('Odu not found');
    }

    // Determine text to convert based on audio_type
    let textToConvert = '';
    switch (audio_type) {
      case 'nome':
        textToConvert = odu.nome;
        break;
      case 'verso_resumido':
        textToConvert = odu.verso_resumido || odu.nome;
        break;
      case 'completo':
        // Strip HTML tags for full text
        textToConvert = (odu.texto_principal || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        break;
      default:
        textToConvert = odu.nome;
    }

    if (!textToConvert) {
      throw new Error('No text to convert');
    }

    console.log(`Generating audio for Odu: ${odu.nome}, type: ${audio_type}, text length: ${textToConvert.length}`);

    // Call ElevenLabs API
    const voiceId = '9BWtsMINqrJLrRacOk9x'; // Aria voice
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: textToConvert,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    const audioData = new Uint8Array(audioBuffer);

    // Generate unique filename
    const fileName = `${odu_id}/${audio_type}_${Date.now()}.mp3`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('odu-audio')
      .upload(fileName, audioData, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload audio file');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('odu-audio')
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // Estimate duration (rough estimate: ~150 words per minute, ~5 chars per word)
    const estimatedDuration = Math.ceil((textToConvert.length / 5) / 150 * 60);

    // Save to cache table
    const { error: insertError } = await supabase
      .from('odu_audio')
      .insert({
        odu_id,
        audio_type,
        audio_url: audioUrl,
        duration_seconds: estimatedDuration,
        voice_id: 'Aria',
      });

    if (insertError) {
      console.error('Cache insert error:', insertError);
      // Don't throw - audio was generated successfully
    }

    console.log('Audio generated and cached:', audioUrl);

    return new Response(
      JSON.stringify({ audio_url: audioUrl, cached: false, duration: estimatedDuration }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-odu-audio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
