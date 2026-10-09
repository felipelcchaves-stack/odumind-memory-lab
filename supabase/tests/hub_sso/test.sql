-- Assertions for the hub_sso migrations (same file in every project; the project's role model
-- comes from project_base.sql: tests.make_admin / tests.make_member / tests.admin_check).
\set ON_ERROR_STOP 1

CREATE FUNCTION tests.assert(_ok BOOLEAN, _what TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _ok IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', _what; END IF;
END $$;
CREATE FUNCTION tests.as_session(_uid UUID, _sid UUID) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role', 'authenticated', 'session_id', _sid)::text, false)
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated, service_role;

-- People
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'joana@ifatokun.com.br'),
  ('00000000-0000-0000-0000-00000000000b', 'aluno@example.com');
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-0000-0000-00000000000e', 'naoconfirmado@ifatokun.com.br', NULL);
INSERT INTO auth.users (id, email, banned_until) VALUES
  ('00000000-0000-0000-0000-00000000000c', 'bloqueado@ifatokun.com.br', now() + interval '1 day');
INSERT INTO auth.users (id, email, deleted_at) VALUES
  ('00000000-0000-0000-0000-00000000000d', 'apagado@ifatokun.com.br', now());
SELECT tests.make_admin('00000000-0000-0000-0000-00000000000a');
SELECT tests.make_member('00000000-0000-0000-0000-00000000000b');
SELECT tests.make_admin('00000000-0000-0000-0000-00000000000c');
SELECT tests.make_admin('00000000-0000-0000-0000-00000000000d');
SELECT tests.make_admin('00000000-0000-0000-0000-00000000000e');
UPDATE auth.users SET email_confirmed_at = now() WHERE id <> '00000000-0000-0000-0000-00000000000e';

-- Supabase sessions: S1 will come from the hub, S2 is a normal password session of the same admin.
INSERT INTO auth.sessions (id, user_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a');
INSERT INTO auth.refresh_tokens (session_id) VALUES
  ('10000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000002');

-- 1. Lookup (service_role only), never creates anything.
SET ROLE service_role;
SELECT tests.assert((SELECT status FROM public.hub_sso_find_user(' JOANA@ifatokun.com.br ', ARRAY['admin'])) = 'ok', 'admin found case-insensitively');
SELECT tests.assert((SELECT user_id FROM public.hub_sso_find_user('joana@ifatokun.com.br', ARRAY['admin'])) = '00000000-0000-0000-0000-00000000000a', 'admin id');
SELECT tests.assert((SELECT status FROM public.hub_sso_find_user('aluno@example.com', ARRAY['admin'])) = 'no_role', 'member refused');
SELECT tests.assert((SELECT status FROM public.hub_sso_find_user('ninguem@ifatokun.com.br', ARRAY['admin'])) = 'no_user', 'unknown refused');
SELECT tests.assert((SELECT status FROM public.hub_sso_find_user('bloqueado@ifatokun.com.br', ARRAY['admin'])) = 'banned', 'banned refused');
SELECT tests.assert((SELECT status FROM public.hub_sso_find_user('apagado@ifatokun.com.br', ARRAY['admin'])) = 'no_user', 'deleted refused');
SELECT tests.assert((SELECT status FROM public.hub_sso_find_user('naoconfirmado@ifatokun.com.br', ARRAY['admin'])) = 'unconfirmed', 'unconfirmed e-mail refused');
SELECT tests.assert((SELECT status FROM public.hub_sso_find_user('joana@ifatokun.com.br', ARRAY[]::text[])) = 'no_role', 'empty role list refuses');
SELECT public.hub_sso_record_session('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'sid-1', '7', 'Joana@ifatokun.com.br');
SELECT public.hub_sso_record_session('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'sid-3', '7', 'joana@ifatokun.com.br');
RESET ROLE;
SELECT tests.assert((SELECT count(*) FROM auth.users) = 5, 'no user created');

-- 2. Browsers cannot call the service functions nor read the table.
SET ROLE authenticated;
SELECT tests.as_session('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001');
DO $$ BEGIN PERFORM public.hub_sso_find_user('joana@ifatokun.com.br', ARRAY['admin']); RAISE EXCEPTION 'FAILED: find_user open to authenticated'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN PERFORM public.hub_sso_revoke('sid-1', NULL); RAISE EXCEPTION 'FAILED: revoke open to authenticated'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN PERFORM public.hub_sso_record_session(gen_random_uuid(), gen_random_uuid(), 'x', 'y', 'z'); RAISE EXCEPTION 'FAILED: record open to authenticated'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN PERFORM public.hub_sso_user_roles(auth.uid()); RAISE EXCEPTION 'FAILED: user_roles open to authenticated'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN PERFORM 1 FROM public.hub_sso_sessions; RAISE EXCEPTION 'FAILED: table readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- 3. Status of the current session.
SELECT tests.assert(public.hub_sso_session_status() ->> 'status' = 'active', 'hub session active');
SELECT tests.assert((public.hub_sso_session_status() -> 'roles') ? 'admin', 'roles include admin');
SELECT tests.assert(tests.admin_check(), 'hub session is admin');
SELECT tests.as_session('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002');
SELECT tests.assert(public.hub_sso_session_status() ->> 'status' = 'none', 'password session is none');
SELECT tests.assert(tests.admin_check(), 'password session is admin');
SELECT tests.as_session('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001');
SELECT tests.assert(public.hub_sso_session_status() ->> 'status' = 'none', 'someone else''s session id is not theirs');
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN PERFORM public.hub_sso_session_status(); RAISE EXCEPTION 'FAILED: status open to anon'; EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
RESET ROLE;

-- 4. Back-channel logout.
SET ROLE service_role;
SELECT tests.assert(public.hub_sso_revoke('sid-1', 'other-sub') = 0, 'sid with another sub revokes nothing');
SELECT tests.assert(public.hub_sso_revoke(NULL, NULL) = 0, 'empty target revokes nothing');
SELECT tests.assert(public.hub_sso_revoke('sid-1', '7') = 1, 'sid revokes its session');
RESET ROLE;
SELECT tests.assert(NOT EXISTS (SELECT 1 FROM auth.sessions WHERE id = '10000000-0000-0000-0000-000000000001'), 'supabase session deleted');
SELECT tests.assert(NOT EXISTS (SELECT 1 FROM auth.refresh_tokens WHERE session_id = '10000000-0000-0000-0000-000000000001'), 'refresh tokens gone');
SELECT tests.assert(EXISTS (SELECT 1 FROM auth.sessions WHERE id = '10000000-0000-0000-0000-000000000002'), 'password session untouched');
SELECT tests.assert(EXISTS (SELECT 1 FROM auth.sessions WHERE id = '10000000-0000-0000-0000-000000000003'), 'other hub session untouched');

SET ROLE authenticated;
SELECT tests.as_session('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001');
SELECT tests.assert(public.hub_sso_session_status() ->> 'status' = 'revoked', 'revoked session reported');
SELECT tests.assert(NOT tests.admin_check(), 'revoked access token loses admin at once');
SELECT tests.as_session('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002');
SELECT tests.assert(tests.admin_check(), 'other sessions keep admin');
RESET ROLE;

SET ROLE service_role;
SELECT tests.assert(public.hub_sso_revoke(NULL, '7') = 2, 'sub-only logout covers every link of that person');
RESET ROLE;
SELECT tests.assert(NOT EXISTS (SELECT 1 FROM auth.sessions WHERE id = '10000000-0000-0000-0000-000000000003'), 'sub logout deleted the session');

-- 5. Revoked links survive housekeeping (the role guard needs them).
INSERT INTO auth.sessions (id, user_id) VALUES ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a');
SET ROLE service_role;
SELECT public.hub_sso_record_session('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', 'sid-4', '7', 'joana@ifatokun.com.br');
RESET ROLE;
SELECT tests.assert((SELECT count(*) FROM public.hub_sso_sessions WHERE revoked_at IS NOT NULL) = 2, 'revoked links kept');
UPDATE public.hub_sso_sessions SET revoked_at = now() - interval '9 days' WHERE hub_sid = 'sid-1';
INSERT INTO auth.sessions (id, user_id) VALUES ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a');
SET ROLE service_role;
SELECT public.hub_sso_record_session('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 'sid-5', '7', 'joana@ifatokun.com.br');
RESET ROLE;
SELECT tests.assert(NOT EXISTS (SELECT 1 FROM public.hub_sso_sessions WHERE hub_sid = 'sid-1'), 'old revoked link cleaned');
SELECT tests.assert(EXISTS (SELECT 1 FROM public.hub_sso_sessions WHERE hub_sid = 'sid-3'), 'recent revoked link kept');
