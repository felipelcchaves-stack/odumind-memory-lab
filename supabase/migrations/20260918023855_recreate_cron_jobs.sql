-- Recreates the 5 cron jobs that existed on the Lovable-managed project
-- (confirmed via Lovable Cloud's Jobs panel and cross-checked against the
-- raw cron.job data in the exported backup - schedules below are in UTC,
-- matching the dashboard's displayed America/Sao_Paulo times minus 3h).
-- Migrated as part of moving off Lovable Cloud to an independently-owned
-- Supabase project.

select cron.schedule(
  'cleanup-old-sessions-daily',
  '0 3 * * *',
  $$
  DELETE FROM active_sessions
  WHERE last_activity < NOW() - INTERVAL '24 hours'
  $$
);

select cron.schedule(
  'sync-memorization-dates-daily',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://xcxxdzipwfmakypegqxb.supabase.co/functions/v1/sync-memorization-dates',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjeHhkemlwd2ZtYWt5cGVncXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTU0NDAsImV4cCI6MjEwNTI3MTQ0MH0.GPVbI1BJ8qXWWDhYKufZQ8ZY4ZvlmLvH_75XNM58S6Y"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

select cron.schedule(
  'auto-renewal-offers-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xcxxdzipwfmakypegqxb.supabase.co/functions/v1/auto-renewal-offers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjeHhkemlwd2ZtYWt5cGVncXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTU0NDAsImV4cCI6MjEwNTI3MTQ0MH0.GPVbI1BJ8qXWWDhYKufZQ8ZY4ZvlmLvH_75XNM58S6Y"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

select cron.schedule(
  'expire-subscriptions-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xcxxdzipwfmakypegqxb.supabase.co/functions/v1/expire-subscriptions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjeHhkemlwd2ZtYWt5cGVncXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTU0NDAsImV4cCI6MjEwNTI3MTQ0MH0.GPVbI1BJ8qXWWDhYKufZQ8ZY4ZvlmLvH_75XNM58S6Y"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

select cron.schedule(
  'notify-expiring-subs-daily',
  '5 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xcxxdzipwfmakypegqxb.supabase.co/functions/v1/notify-expiring-subscriptions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjeHhkemlwd2ZtYWt5cGVncXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTU0NDAsImV4cCI6MjEwNTI3MTQ0MH0.GPVbI1BJ8qXWWDhYKufZQ8ZY4ZvlmLvH_75XNM58S6Y"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
