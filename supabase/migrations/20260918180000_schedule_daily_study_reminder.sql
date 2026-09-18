-- Real Web Push daily reminder, replacing the client-side setTimeout-based
-- reminders (which only worked while the tab stayed open/foregrounded).
-- 22:00 UTC = 19:00 America/Sao_Paulo (BRT, UTC-3).
select cron.schedule(
  'send-daily-study-reminder',
  '0 22 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://xcxxdzipwfmakypegqxb.supabase.co/functions/v1/send-daily-study-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjeHhkemlwd2ZtYWt5cGVncXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTU0NDAsImV4cCI6MjEwNTI3MTQ0MH0.GPVbI1BJ8qXWWDhYKufZQ8ZY4ZvlmLvH_75XNM58S6Y"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
