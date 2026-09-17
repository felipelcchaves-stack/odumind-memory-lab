import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CourseLaunchRequest {
  courseId: string;
  courseName: string;
  courseDescription?: string;
  courseSlug: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Isesemind <noreply@isesemind.ifatokun.com.br>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[NOTIFY-COURSE-LAUNCH] Function started");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("[NOTIFY-COURSE-LAUNCH] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[NOTIFY-COURSE-LAUNCH] No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.log("[NOTIFY-COURSE-LAUNCH] Invalid token:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc("has_admin_role", { _user_id: user.id });
    if (!isAdmin) {
      console.log("[NOTIFY-COURSE-LAUNCH] User is not admin");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { courseId, courseName, courseDescription, courseSlug }: CourseLaunchRequest = await req.json();
    console.log("[NOTIFY-COURSE-LAUNCH] Course data:", { courseId, courseName, courseSlug });

    // Get all users with their emails
    const { data: users, error: usersError } = await supabaseClient.auth.admin.listUsers();

    if (usersError) {
      console.error("[NOTIFY-COURSE-LAUNCH] Error fetching users:", usersError);
      return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[NOTIFY-COURSE-LAUNCH] Found ${users.users.length} users to notify`);

    // Get site URL from settings
    const { data: siteUrlSetting } = await supabaseClient
      .from("app_settings")
      .select("value")
      .eq("key", "site_url")
      .single();

    const siteUrl = siteUrlSetting?.value || "https://isesemind.ifatokun.com.br";

    const emailHtml = (name: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9f5f0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #d4a574 0%, #c9956c 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
              🎉 Novo Curso Lançado!
            </h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">
              ${name}
            </h2>
            
            ${courseDescription ? `
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${courseDescription}
              </p>
            ` : ''}
            
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Temos o prazer de anunciar que um novo curso está disponível na plataforma Isesemind! 
              Este conteúdo exclusivo foi preparado especialmente para aprofundar seu conhecimento sobre Ifá.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}/caminho/${courseSlug}" 
                 style="display: inline-block; background: linear-gradient(135deg, #d4a574 0%, #c9956c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Acessar Agora
              </a>
            </div>
            
            <p style="color: #888888; font-size: 14px; margin-top: 30px; text-align: center;">
              Continue sua jornada de aprendizado com a Isesemind!
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 20px 30px; text-align: center;">
            <p style="color: #888888; font-size: 12px; margin: 0;">
              Este email foi enviado automaticamente pela plataforma Isesemind.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send emails in batches to avoid rate limits
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.users.length; i += batchSize) {
      const batch = users.users.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (user) => {
        if (!user.email) return;

        try {
          await sendEmail(
            user.email,
            `🎉 Novo Curso Disponível: ${courseName}`,
            emailHtml(courseName)
          );
          successCount++;
        } catch (error) {
          console.error(`[NOTIFY-COURSE-LAUNCH] Error sending email to ${user.email}:`, error);
          errorCount++;
        }
      });

      await Promise.all(emailPromises);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < users.users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[NOTIFY-COURSE-LAUNCH] Completed - Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Emails enviados com sucesso`,
        stats: { successCount, errorCount, totalUsers: users.users.length }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[NOTIFY-COURSE-LAUNCH] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
