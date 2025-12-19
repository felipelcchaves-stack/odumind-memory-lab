import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${step}`, details ? JSON.stringify(details, null, 2) : '');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting admin-delete-user function");

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client with user's token to verify they are admin
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is authenticated
    const { data: { user: callerUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !callerUser) {
      logStep("Authentication failed", { authError });
      throw new Error('Unauthorized');
    }
    logStep("Caller authenticated", { callerId: callerUser.id, callerEmail: callerUser.email });

    // Verify caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_admin_role', { _user_id: callerUser.id });
    if (!isAdmin) {
      logStep("Caller is not admin");
      throw new Error('Unauthorized: Admin role required');
    }
    logStep("Caller is admin");

    // Parse request body
    const { user_id } = await req.json();
    if (!user_id) {
      throw new Error('user_id is required');
    }
    logStep("Target user", { user_id });

    // Prevent self-deletion
    if (user_id === callerUser.id) {
      logStep("Attempted self-deletion blocked");
      throw new Error('Você não pode excluir sua própria conta');
    }

    // Check if target user is admin (optional protection)
    const { data: targetIsAdmin } = await supabaseAdmin.rpc('has_admin_role', { _user_id: user_id });
    if (targetIsAdmin) {
      logStep("Attempted to delete admin user");
      throw new Error('Não é permitido excluir usuários administradores');
    }

    // Get user info before deletion for logging
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('nome')
      .eq('user_id', user_id)
      .single();

    const { data: userEmail } = await supabaseAdmin.rpc('get_user_emails', { user_ids: [user_id] });
    const targetEmail = userEmail?.[0]?.email || 'unknown';
    const targetName = userProfile?.nome || 'unknown';
    
    logStep("Deleting user", { 
      userId: user_id,
      name: targetName,
      email: targetEmail 
    });

    // Delete the user from auth (CASCADE will handle related tables)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      logStep("Error deleting user", { deleteError });
      throw new Error(`Erro ao excluir usuário: ${deleteError.message}`);
    }

    logStep("User deleted successfully", { 
      userId: user_id,
      name: targetName,
      email: targetEmail,
      deletedBy: callerUser.email
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Usuário ${targetName} (${targetEmail}) excluído com sucesso`,
        deletedUser: {
          id: user_id,
          name: targetName,
          email: targetEmail
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    logStep("Error in admin-delete-user", { error: error.message });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Erro ao excluir usuário'
      }),
      {
        status: error.message === 'Unauthorized' || error.message?.includes('Admin role') ? 403 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
