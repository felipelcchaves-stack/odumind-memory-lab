-- check-forgetting-risk (real Ebbinghaus forgetting-curve calculation,
-- supabase/functions/check-forgetting-risk/index.ts) existed but was never
-- scheduled anywhere, so at-risk Odu were never proactively rescheduled.
-- Activating it as a daily job, right after sync-memorization-dates-daily.
select cron.schedule(
  'check-forgetting-risk-daily',
  '10 3 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://xcxxdzipwfmakypegqxb.supabase.co/functions/v1/check-forgetting-risk',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjeHhkemlwd2ZtYWt5cGVncXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTU0NDAsImV4cCI6MjEwNTI3MTQ0MH0.GPVbI1BJ8qXWWDhYKufZQ8ZY4ZvlmLvH_75XNM58S6Y"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
