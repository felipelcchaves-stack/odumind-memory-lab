-- Assertions for the Custom Access Token Hook (migration *_hub_sso_access_token_hook.sql) and the
-- session gate it drives. Same file in every project; runs after test.sql in the same database.
\set ON_ERROR_STOP 1

CREATE FUNCTION tests.event(_uid UUID, _sid UUID, _method TEXT) RETURNS JSONB LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'user_id', _uid,
    'authentication_method', _method,
    'claims', jsonb_build_object(
      'iss', 'https://example.supabase.co/auth/v1', 'aud', 'authenticated', 'exp', 2000000000,
      'iat', 1900000000, 'sub', _uid, 'role', 'authenticated', 'aal', 'aal1', 'session_id', _sid,
      'email', 'x@example.com', 'phone', '', 'is_anonymous', false))
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated, service_role, supabase_auth_admin;
GRANT USAGE ON SCHEMA tests TO supabase_auth_admin;

-- People: H = admin (hub-managed role), M = member (role not managed by the hub).
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'hook-admin@ifatokun.com.br', now()),
  ('00000000-0000-0000-0000-0000000000b1', 'hook-membro@example.com', now());
SELECT tests.make_admin('00000000-0000-0000-0000-0000000000a1');
SELECT tests.make_member('00000000-0000-0000-0000-0000000000b1');
-- Sessions of the admin: S1 hub (linked), S2 local (password / e-mailed link), S3 hub then signed out.
INSERT INTO auth.sessions (id, user_id) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000b1');
SET ROLE service_role;
SELECT public.hub_sso_record_session('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'sid-h1', '70', 'hook-admin@ifatokun.com.br');
SELECT public.hub_sso_record_session('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'sid-h3', '70', 'hook-admin@ifatokun.com.br');
SELECT tests.assert(public.hub_sso_revoke('sid-h3', '70') = 1, 'S3 signed out at the hub');
RESET ROLE;

-- 1. Only Supabase Auth (supabase_auth_admin) can call the hook; it is SECURITY DEFINER with a fixed search_path.
SELECT tests.assert((SELECT prosecdef FROM pg_proc WHERE oid = 'public.hub_sso_access_token_hook(jsonb)'::regprocedure), 'hook is security definer');
SELECT tests.assert((SELECT proconfig FROM pg_proc WHERE oid = 'public.hub_sso_access_token_hook(jsonb)'::regprocedure) = ARRAY['search_path=public'], 'hook has a fixed search_path');
SELECT tests.assert(has_function_privilege('supabase_auth_admin', 'public.hub_sso_access_token_hook(jsonb)', 'EXECUTE'), 'auth admin can execute');
SELECT tests.assert(NOT has_function_privilege('authenticated', 'public.hub_sso_access_token_hook(jsonb)', 'EXECUTE'), 'authenticated cannot');
SELECT tests.assert(NOT has_function_privilege('anon', 'public.hub_sso_access_token_hook(jsonb)', 'EXECUTE'), 'anon cannot');
SELECT tests.assert(NOT has_function_privilege('service_role', 'public.hub_sso_access_token_hook(jsonb)', 'EXECUTE'), 'service_role cannot');
SELECT tests.assert(NOT has_function_privilege('authenticated', 'public.hub_sso_hook_roles()', 'EXECUTE'), 'roles list not exposed');

SET ROLE supabase_auth_admin;
-- 2. Members: the token is exactly what Supabase Auth proposed, whatever the method.
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-000000000004', 'password'))
  = jsonb_build_object('claims', tests.event('00000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-000000000004', 'password') -> 'claims'), 'member password: claims untouched');
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-000000000004', 'token_refresh')) ? 'claims', 'member refresh: issued');
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-000000000004', 'recovery')) ? 'claims', 'member reset link: issued');
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000c9', gen_random_uuid(), 'password')) ? 'claims', 'unknown user id: issued, untouched');

-- 3. Admin, hub session: issued and marked linked, required claims kept.
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000001', 'token_refresh')) #>> '{claims,hub_sso}' = 'linked', 'hub session refresh: linked');
SELECT tests.assert((SELECT bool_and(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000001', 'magiclink')) -> 'claims' ? k)
  FROM unnest(ARRAY['iss','aud','exp','iat','sub','role','aal','session_id','email','phone','is_anonymous']) k), 'required claims kept');
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000001', 'magiclink')) #>> '{claims,role}' = 'authenticated', 'role claim unchanged');

-- 4. Admin, session not from the hub: password, reset link, sign-up, invite and refresh are refused.
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000002', m)) #>> '{error,http_code}' = '403', 'refused: ' || m)
FROM unnest(ARRAY['password', 'recovery', 'token_refresh', 'email/signup', 'invite', 'email_change', 'anonymous']) m;
SELECT tests.assert(NOT (public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000002', 'password')) ? 'claims'), 'refusal carries no claims');
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000002', 'password')) #>> '{error,message}' LIKE '%Hub%', 'refusal says to use the hub');
-- ... a magic link (the hub's own, or an e-mailed one) is issued but marked unlinked.
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000002', m)) #>> '{claims,hub_sso}' = 'unlinked', 'unlinked: ' || m)
FROM unnest(ARRAY['magiclink', 'otp', 'totp', 'oauth']) m;

-- 5. Admin, hub session that was signed out: refused.
SELECT tests.assert(public.hub_sso_access_token_hook(tests.event('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-000000000003', 'token_refresh')) #>> '{error,http_code}' = '401', 'signed-out hub session refused');
RESET ROLE;

-- 6. The gate in the role checks. Without the claim (hook off) nothing changes.
SET ROLE authenticated;
SELECT tests.as_claims(jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated', 'session_id', '30000000-0000-0000-0000-000000000002'));
SELECT tests.assert(tests.admin_check(), 'hook off: local session keeps admin (as before)');
SELECT tests.assert(NOT public.hub_sso_current_session_revoked(), 'hook off: not revoked');
-- An e-mailed magic link (unlinked, never linked): no admin rights.
SELECT tests.as_claims(jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated', 'session_id', '30000000-0000-0000-0000-000000000002', 'hub_sso', 'unlinked'));
SELECT tests.assert(NOT tests.admin_check(), 'unlinked local session: no admin');
SELECT tests.assert(public.hub_sso_current_session_revoked(), 'unlinked local session: gate closed');
-- The hub's own first token is unlinked at issuance, but linked before the browser gets it: admin.
SELECT tests.as_claims(jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated', 'session_id', '30000000-0000-0000-0000-000000000001', 'hub_sso', 'unlinked'));
SELECT tests.assert(tests.admin_check(), 'unlinked at issuance, linked now: admin');
SELECT tests.as_claims(jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated', 'session_id', '30000000-0000-0000-0000-000000000001', 'hub_sso', 'linked'));
SELECT tests.assert(tests.admin_check(), 'linked: admin');
-- Someone else's linked session id does not help.
SELECT tests.as_claims(jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated', 'session_id', '30000000-0000-0000-0000-000000000001', 'hub_sso', 'unlinked'));
SELECT tests.assert(public.hub_sso_current_session_revoked(), 'another user''s session id: gate closed');
-- Signed out at the hub: closed with or without the claim.
SELECT tests.as_claims(jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated', 'session_id', '30000000-0000-0000-0000-000000000003', 'hub_sso', 'linked'));
SELECT tests.assert(NOT tests.admin_check(), 'signed-out hub session: no admin');
RESET ROLE;
-- The Edge Function guard asks the same question over PostgREST, as the caller (anon key + the caller's JWT).
SET ROLE anon;
SELECT tests.as_claims('{"role": "anon"}');
SELECT tests.assert(NOT public.hub_sso_current_session_revoked(), 'anon: callable, false');
RESET ROLE;
SELECT tests.as_claims('{}');
