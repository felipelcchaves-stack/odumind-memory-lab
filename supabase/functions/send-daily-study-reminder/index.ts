import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import webpush from "https://esm.sh/web-push@3.6.7";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-DAILY-REMINDER] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    logStep("Started");

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not configured");
    }

    webpush.setVapidDetails(
      "mailto:contato@isesemind.com",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth");

    if (subsError) throw subsError;

    if (!subs || subs.length === 0) {
      logStep("No push subscriptions registered");
      return new Response(
        JSON.stringify({ success: true, sent: 0, skipped: 0, removed: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const userIds = [...new Set(subs.map((s) => s.user_id))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, streak, last_study_date")
      .in("user_id", userIds);

    const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    let sent = 0;
    let skipped = 0;
    let removed = 0;

    for (const sub of subs) {
      const profile = profileByUser.get(sub.user_id);
      const studiedToday = profile?.last_study_date?.slice(0, 10) === todayStr;

      // Já estudou hoje e não tem nada pendente pra revisar agora - não manda
      // notificação à toa.
      const { count: dueCount } = await supabase
        .from("memorizacao")
        .select("id", { count: "exact", head: true })
        .eq("user_id", sub.user_id)
        .in("status", ["estudando", "memorizado"])
        .lte("proxima_revisao", nowIso);

      if (studiedToday && !dueCount) {
        skipped++;
        continue;
      }

      let title: string;
      let body: string;
      if (dueCount && dueCount > 0) {
        title = "📚 Revisões pendentes";
        body = `Você tem ${dueCount} Odu${dueCount > 1 ? "s" : ""} pra revisar hoje.`;
      } else if (profile?.streak && profile.streak > 0) {
        title = `🔥 Seu streak de ${profile.streak} dias`;
        body = "Estude hoje pra não perder seu progresso!";
      } else {
        title = "⏰ Hora de estudar!";
        body = "Não esqueça de estudar os Odu hoje.";
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body, url: "/dashboard" })
        );
        sent++;
      } catch (err: any) {
        // 404/410 = inscrição expirada/inválida do lado do navegador - limpar.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else {
          logStep("ERROR sending push", { subId: sub.id, message: err?.message });
        }
      }
    }

    logStep("Finished", { sent, skipped, removed, total: subs.length });

    return new Response(
      JSON.stringify({ success: true, sent, skipped, removed }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
