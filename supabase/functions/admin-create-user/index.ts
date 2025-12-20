import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  nome?: string;
  meta_diaria?: number;
  avatar_url?: string;
  role?: 'admin' | 'colaborador' | 'aluno';
}

serve(async (req) => {
  console.log('[ADMIN-CREATE-USER] Recebida requisição');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[ADMIN-CREATE-USER] Missing authorization header');
      throw new Error('Missing authorization header');
    }

    // Extract the token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('[ADMIN-CREATE-USER] Token vazio');
      throw new Error('Invalid authorization token');
    }

    console.log('[ADMIN-CREATE-USER] Token extraído, verificando usuário...');

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user using the token directly
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[ADMIN-CREATE-USER] Erro ao verificar usuário:', userError);
      throw new Error('Unauthorized - Token inválido ou expirado');
    }

    console.log('[ADMIN-CREATE-USER] Usuário autenticado:', user.email, user.id);

    // Create admin client with service role key for checking roles
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user has admin role using admin client (bypasses RLS)
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (rolesError) {
      console.error('[ADMIN-CREATE-USER] Erro ao buscar roles:', rolesError);
      throw new Error('Erro ao verificar permissões');
    }

    if (!roles) {
      console.error('[ADMIN-CREATE-USER] Usuário não é admin:', user.email);
      throw new Error('Acesso negado - Apenas administradores podem criar usuários');
    }

    console.log('[ADMIN-CREATE-USER] Admin verificado');

    // Get request body
    const body: CreateUserRequest = await req.json();
    console.log('[ADMIN-CREATE-USER] Email a criar:', body.email);
    
    if (!body.email || !body.password) {
      throw new Error('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      throw new Error('Formato de email inválido');
    }

    // supabaseAdmin já foi criado acima

    // Check if email already exists
    console.log('[ADMIN-CREATE-USER] Verificando se email já existe...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error('[ADMIN-CREATE-USER] Erro ao listar usuários:', listError);
    } else {
      const emailExists = existingUsers?.users?.some(
        (u) => u.email?.toLowerCase() === body.email.toLowerCase()
      );
      if (emailExists) {
        console.error('[ADMIN-CREATE-USER] Email já cadastrado:', body.email);
        throw new Error('Este email já está cadastrado no sistema');
      }
    }

    console.log('[ADMIN-CREATE-USER] Criando usuário...');

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      console.error('[ADMIN-CREATE-USER] Erro ao criar usuário:', createError);
      
      // Traduzir mensagens de erro comuns
      let errorMessage = createError?.message || 'Failed to create user';
      if (errorMessage.includes('already been registered')) {
        errorMessage = 'Este email já está cadastrado no sistema';
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = 'Formato de email inválido';
      }
      
      throw new Error(errorMessage);
    }

    console.log('[ADMIN-CREATE-USER] Usuário criado:', newUser.user.id);

    // Update the profile with additional data
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        nome: body.nome || null,
        meta_diaria: body.meta_diaria || 30,
        avatar_url: body.avatar_url || null,
      })
      .eq('user_id', newUser.user.id);

    if (profileError) {
      console.error('[ADMIN-CREATE-USER] Erro ao atualizar profile:', profileError);
    } else {
      console.log('[ADMIN-CREATE-USER] Profile atualizado');
    }

    // Set user role
    const { error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: body.role || 'aluno',
      });

    if (userRoleError) {
      console.error('[ADMIN-CREATE-USER] Erro ao definir role:', userRoleError);
    } else {
      console.log('[ADMIN-CREATE-USER] Role definida:', body.role || 'aluno');
    }

    console.log('[ADMIN-CREATE-USER] ✅ Usuário criado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[ADMIN-CREATE-USER] ❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
