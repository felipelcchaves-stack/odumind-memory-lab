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

    console.log('Fetching all public settings in one batch...');

    // Fetch all public settings in a single query
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .eq('is_public', true);

    if (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }

    console.log(`Successfully fetched ${settings?.length || 0} public settings`);

    // Transform to key-value object for efficient client-side access
    const settingsObject: Record<string, string | null> = {};
    settings?.forEach((setting) => {
      settingsObject[setting.key] = setting.value;
    });

    // Return with cache headers for 5 minutes (client can cache)
    return new Response(
      JSON.stringify(settingsObject),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // Allow client-side caching for 5 minutes, revalidate after
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
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
