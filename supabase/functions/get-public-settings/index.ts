import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching public settings...');

    // Get all public settings (tracking pixels)
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('key, value, category')
      .eq('is_public', true)
      .order('key');

    if (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }

    console.log(`Successfully fetched ${settings?.length || 0} public settings`);

    // Transform to key-value object
    const settingsObject = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>) || {};

    return new Response(
      JSON.stringify(settingsObject),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error('Error in get-public-settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
