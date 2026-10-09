# Login único pelo Hub — área administrativa do Isesemind (Odùmind)

Só o **/admin** usa o Hub. Alunos continuam com o login de sempre (`/auth`, e-mail e senha no
Supabase, com a regra de sessão única). Para quem administra: senha e código do app autenticador só no Hub, uma vez.
Abrir o Isesemind pelo lançador do Hub cai direto no painel, já logado.

Sistema no Hub: **id 10** (`https://isesemind.ifatokun.com.br/`).

## 1. Decisão de arquitetura (registro)

**Contexto.** O Isesemind é uma SPA estática (Vite + React) servida pelo Nginx; os dados e o login
estão no Supabase (`xcxxdzipwfmakypegqxb`). Uma SPA não guarda segredo, e o Hub exige um cliente
OIDC confidencial (code + PKCE S256 + `client_secret`).

**Opções avaliadas (lendo o `@supabase/auth-js` 2.81.1 instalado, não a memória):**

- *Provedor OIDC do próprio Supabase Auth.* O tipo `Provider` do auth-js só aceita provedores
  fixos (google, azure, keycloak, workos…); não há emissor OIDC genérico no cliente. `signInWithSSO`
  é SAML (plano pago). Além disso o Supabase **criaria** usuários sozinho no primeiro login e não
  tem logout por back-channel. Descartado.
- *Third-party auth (JWT do Hub direto no PostgREST).* Só para provedores listados (Clerk,
  Firebase, Auth0, Cognito, WorkOS) e trocaria o modelo de sessão do app inteiro. Descartado.
- **Escolhida: uma Edge Function `hub-sso` como cliente OIDC confidencial.** Ela guarda o segredo,
  troca o código no Hub, valida o ID token com `jose` no JWKS do Hub e abre uma sessão Supabase
  **para um usuário que já existe e já é admin**, pelo caminho oficial do Admin API:
  `auth.admin.generateLink({ type: "magiclink" })` (não envia e-mail) e `auth.verifyOtp({ token_hash })`
  no próprio servidor. A sessão volta para a SPA **no corpo de um POST**, nunca na URL.
  `auth.admin.signOut(jwt)` exige o JWT da pessoa (não serve para o back-channel), então o logout
  apaga a linha em `auth.sessions` por uma função SQL `SECURITY DEFINER` (os refresh tokens caem
  junto, `ON DELETE CASCADE`).

**Mesmo desenho e mesmos arquivos** no Gba-Orun, no Isesemind e no Academy:
`supabase/functions/_shared/hub-sso/*` e `src/lib/hubSso.ts` são idênticos nos três; muda só a
migração (quem conta como admin) e a ligação com as telas (`src/lib/hubSsoProject.ts`).

## 2. Como funciona

```
Lançador do Hub ──> /auth/hub/iniciar?iss=<emissor>&target_link_uri=<url do sistema>
  SPA confere iss (= VITE_HUB_ISSUER) e o destino (mesma origem, dentro de /admin; senão /admin)
  SPA cria verifier PKCE + state + nonce (sessionStorage, 10 min, uso único)
  SPA ──POST hub-sso/start──> função devolve a URL de autorização do Hub (client_id, redirect_uri)
Hub (sessão + TOTP já feitos) ──> /auth/hub/callback?code=…&state=…
  SPA confere state, apaga o pendente, ──POST hub-sso/exchange {code, verifier, nonce}──>
  função: /token com segredo + verifier → valida ID token (JWKS, iss, aud, exp, nonce, azp,
          email_verified, sid) → hub_sso_find_user(e-mail, papéis) → só usuário EXISTENTE,
          e-mail confirmado, não bloqueado, com papel permitido → generateLink + verifyOtp →
          grava (sessão Supabase ↔ sid do Hub) → troca a senha Supabase por uma aleatória
          → encerra as sessões Supabase dessa pessoa abertas SEM o Hub (senha, link de redefinição)
  SPA: supabase.auth.setSession(...) → enforce-single-session (mesma regra do login por senha) → /admin
Sair no Isesemind ──> supabase.auth.signOut() → end_session do Hub ("Sair de todos os sistemas?")
Hub encerra a sessão ──POST logout_token──> hub-sso/backchannel-logout
  função valida o logout token (JWKS, iss, aud, iat ≤ 5 min, jti, evento, sem nonce)
  → hub_sso_revoke(sid, sub): marca o vínculo e apaga as sessões Supabase
  → has_admin_role()/has_colaborador_role() passam a dizer "não" para o access token que ainda estiver no navegador
  → a tela do admin percebe em até 1 min (ou ao voltar para a aba) e volta para o Hub
```

Sem sessão, abrir `/admin` direto vai para o Hub e volta para a mesma página (não existe mais tela
de login do admin no uso normal). Aluno ou colaborador (papel fora de `HUB_SSO_ALLOWED_ROLES`) continua com as regras atuais do app.

## 3. Rotas e funções

| O quê | Onde |
| --- | --- |
| Entrada pelo lançador (initiate_login_uri) | `https://isesemind.ifatokun.com.br/auth/hub/iniciar` (SPA, `src/pages/HubSsoStart.tsx`) |
| Retorno do Hub (redirect_uri) | `https://isesemind.ifatokun.com.br/auth/hub/callback` (SPA, `src/pages/HubSsoCallback.tsx`) |
| Depois de sair (post_logout_redirect_uri) | `https://isesemind.ifatokun.com.br/` |
| Logout por back-channel | `https://xcxxdzipwfmakypegqxb.supabase.co/functions/v1/hub-sso/backchannel-logout` |
| Edge Function | `supabase/functions/hub-sso` (`verify_jwt = false`): `GET status`, `POST start`, `POST exchange`, `POST backchannel-logout` |
| Guarda do /admin | `src/components/hub-sso/HubAdminGuard.tsx` (em volta do `AdminLayout` em `src/App.tsx`) |
| "Sair" | `src/lib/hubSsoSession.ts` → `signOutWithHub()` (usado em `src/components/DashboardHeader.tsx`; só vai ao Hub se a sessão veio do Hub) |
| Sessão única | `src/lib/hubSsoProject.ts` chama `enforce-single-session` depois do login pelo Hub e grava `session_id` (o `useSessionValidation` confere a cada minuto) |
| Banco | `supabase/migrations/20261008230000_hub_sso.sql` (tabela `hub_sso_sessions` + funções), `20261009090000_hub_sso_end_local_sessions.sql` (encerra as sessões sem Hub de quem entrou pelo Hub) e `20261008230100_hub_sso_role_guard.sql` (`has_admin_role` e `has_colaborador_role` recusam sessão revogada); segurança: `20261009120000_security_subscriptions_no_self_service.sql` (aluno não se dá plano pago); hook: `20261009130000_hub_sso_access_token_hook.sql` (só cria as funções, ver §9) |

## 4. Configuração (nada fixo no código)

Segredos da Edge Function (`supabase secrets set`, nunca no git):

| Chave | Valor em produção | Observação |
| --- | --- | --- |
| `HUB_SSO_ENABLED` | `true` | Interruptor do servidor. `false` = a SPA volta ao login antigo **sem novo build** (plano B de emergência). |
| `HUB_ISSUER` | `https://hub.ifatokun.com.br/oidc` | |
| `HUB_CLIENT_ID` | do bloco "Login único" do sistema 10 | |
| `HUB_CLIENT_SECRET` | idem (aparece uma vez) | |
| `HUB_SSO_APP_URL` | `https://isesemind.ifatokun.com.br` | origem da SPA: monta o redirect_uri e libera o CORS |
| `HUB_SSO_ALLOWED_ROLES` | `admin` | papéis de `user_roles` (`admin`, `colaborador`, `aluno`, `user`) que entram pelo Hub. Para os colaboradores também usarem o Hub: `admin,colaborador` (cada um precisa de conta `@ifatokun.com.br` no Hub) |
| `HUB_SSO_LOCK_PASSWORD` | `true` (padrão) | troca a senha Supabase do admin por uma aleatória a cada login pelo Hub e encerra as sessões dele abertas sem o Hub: ninguém entra no admin com e-mail+senha direto no Supabase Auth (anon key pública) pulando o Hub, nem fica com uma sessão antiga aberta com a senha |
| `HUB_SSO_TOKEN_AUTH_METHOD` | `client_secret_basic` (padrão) | ou `client_secret_post`, igual ao bloco do Hub |
| `HUB_SSO_CALLBACK_PATH`, `HUB_SSO_POST_LOGOUT_PATH` | padrão `/auth/hub/callback` e `/` | só se mudar as rotas |

Variáveis de build da SPA (no `.env` da VPS em `~/apps/odumind-memory-lab`, lido pelo `npm run build` que o `deploy.yml` roda lá; modelo em `.env.example`):

| Chave | Valor | Observação |
| --- | --- | --- |
| `VITE_HUB_SSO_ENABLED` | `true` | sem isto o app fica exatamente como antes |
| `VITE_HUB_ISSUER` | `https://hub.ifatokun.com.br/oidc` | único `iss` aceito na entrada |
| `VITE_HUB_SSO_LOCAL_LOGIN` | vazio / `false` | **plano B de emergência**: `true` volta a aceitar o login antigo do admin (e-mail e senha em `/auth`); com `HUB_SSO_LOCK_PASSWORD` ligado é preciso usar "Esqueci a senha" |
| `VITE_HUB_SSO_FUNCTION_URL` | opcional | padrão `${VITE_SUPABASE_URL}/functions/v1/hub-sso` |

## 5. Passo a passo de produção (Felipe)

1. **E-mails.** O Hub só emite contas `@ifatokun.com.br`. Cada admin do Isesemind precisa ter, no
   Supabase, o **mesmo** e-mail da conta do Hub, confirmado. Conferir no SQL Editor:
   ```sql
   SELECT u.email, u.email_confirmed_at IS NOT NULL AS confirmado
   FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'admin';
   ```
   Quem não for `@ifatokun.com.br`: trocar o e-mail (Authentication › Users › usuário › e-mail)
   **antes** de ligar. Ninguém é criado nem promovido automaticamente.
2. **Hub › Sistemas › Isesemind (id 10) › Login único › Configurar**: copiar o `client_secret`, e
   preencher:
   - URL de retorno: `https://isesemind.ifatokun.com.br/auth/hub/callback`
   - URL de logout por back-channel: `https://xcxxdzipwfmakypegqxb.supabase.co/functions/v1/hub-sso/backchannel-logout`
   - URL após sair: `https://isesemind.ifatokun.com.br/`
   - URL de entrada (initiate_login_uri): `https://isesemind.ifatokun.com.br/auth/hub/iniciar`
   - Endereço do sistema no Hub pode continuar `https://isesemind.ifatokun.com.br/` (a entrada leva
     para `/admin`). Ligar o interruptor e liberar o sistema para as pessoas certas.
3. **Segredos da função** (antes do deploy da função):
   ```bash
   supabase secrets set --project-ref xcxxdzipwfmakypegqxb \
     HUB_SSO_ENABLED=true HUB_ISSUER=https://hub.ifatokun.com.br/oidc \
     HUB_CLIENT_ID=hub-10-xxxx HUB_CLIENT_SECRET='...' \
     HUB_SSO_APP_URL=https://isesemind.ifatokun.com.br HUB_SSO_ALLOWED_ROLES=admin
   ```
4. **Banco + função.** Este repositório não tem workflow do Supabase: aplicar à mão, depois do
   passo 3:
   ```bash
   supabase link --project-ref xcxxdzipwfmakypegqxb
   supabase db push            # aplica 20261008230000_hub_sso.sql, 20261008230100_hub_sso_role_guard.sql e 20261009090000_hub_sso_end_local_sessions.sql
   supabase functions deploy hub-sso --project-ref xcxxdzipwfmakypegqxb
   ```
   A ordem completa das migrações deste branch está em §9.1. A `20261009130000` só cria as funções
   do hook: nada muda até você ligá-lo (§9.3).
   Para aplicar **só a correção de segurança agora**, sem o SSO: (1) `supabase functions deploy
   claim-referral-rewards --project-ref xcxxdzipwfmakypegqxb`; (2) SQL Editor › colar o conteúdo
   de `supabase/migrations/20261009120000_security_subscriptions_no_self_service.sql` › Run. Antes,
   para conferir o que existe hoje: `SELECT policyname, cmd FROM pg_policies WHERE tablename IN
   ('subscriptions', 'referral_rewards');`. Quando o `db push` rodar depois, ela roda de novo sem
   efeito (é idempotente).
   Publicar as funções alteradas. A `claim-referral-rewards` vai **antes** do `supabase db push`
   acima (a migração de segurança tira as policies de que a versão antiga dependia); as outras podem
   ir depois. O guarda vale mesmo com o hook desligado: também barra o token de uma sessão encerrada
   no Hub.
   ```bash
   for f in claim-referral-rewards admin-change-subscription admin-create-user admin-delete-user \
     fix-escaped-html fix-family-group generate-verso-resumido notify-course-launch \
     send-renewal-offer sync-pagarme-revenue; do
     supabase functions deploy "$f" --project-ref xcxxdzipwfmakypegqxb
   done
   ```
5. **SPA.** No `.env` da VPS (`~/apps/odumind-memory-lab/.env`) acrescentar
   `VITE_HUB_SSO_ENABLED=true` e `VITE_HUB_ISSUER=https://hub.ifatokun.com.br/oidc`; o próximo push
   em `main` (ou `npm run build` lá) já gera o build com o login pelo Hub.
6. **Teste**: Hub › lançador › Isesemind → cai em `/admin` logado. Sair no Hub → em até 1 minuto o
   admin volta para o login do Hub.
7. **Recomendado**: Authentication › Settings › JWT expiry em 600–900 s (hoje 3600 s). O
   `has_admin_role` já recusa o token revogado na hora; isto encurta o resto (ex.: telas que só leem a
   própria linha).

**Emergência (Hub fora do ar):** se o hook de §9.3 estiver ligado, **desligue-o primeiro** (senão "Esqueci a senha" é recusado para admin). Depois: `supabase secrets set HUB_SSO_ENABLED=false` → o `/admin` volta
ao fluxo antigo sem rebuild (com a senha aleatória, use "Esqueci a senha"). Ou rebuild com
`VITE_HUB_SSO_LOCAL_LOGIN=true`.

## 6. Testes

- `npm test` (novo: `vitest run`) — `src/test/hub-sso/*.test.ts` (101 testes no `npm test`, incluindo `guard.test.ts`: o guarda das Edge Functions, §9.4): validação de `iss`/`target_link_uri`,
  PKCE (vetor do RFC 7636), estado de uso único e expiração, ID token e logout token **assinados
  de verdade** (RS256, chave de teste) e validados pelo `jose` num JWKS servido por HTTP local
  (nonce, aud, azp, iss, exp, iat, jti, evento, assinatura forjada, outro algoritmo), código usado
  duas vezes, PKCE errado, mapeamento e recusas (sem usuário, sem papel, bloqueado, e-mail não
  confirmado), troca de senha, o cliente `supabase-js` real com `fetch` falso (confere que só
  chama `rpc/hub_sso_find_user`, `admin/generate_link` e `verify`, nunca cria usuário).
- `bash supabase/tests/hub_sso/run.sh` — além do abaixo, roda `hook_test.sql` (o hook como
  `supabase_auth_admin`: permissões, cada método de login, claims obrigatórias mantidas, a regra
  com e sem a claim) e os testes de segurança (`security_base/before/after.sql`): o aluno se dando plano pago (update e insert) e reescrevendo recompensa antes da correção e barrado depois (aplicada duas vezes), com a leitura, a tela de admin e o service role ainda funcionando.
  O mesmo script aplica as migrações num PostgreSQL local descartável
  (socket, sem porta) com um esqueleto do `auth` e confere permissões, status, revogação e o
  `has_role` recusando o token revogado.
- `scripts/hub-sso-dev.ts` — a função real em Deno + um Supabase falso em memória, para testar no
  navegador contra o Hub local (instruções no topo do arquivo).

## 7. Achados durante o trabalho

- **ALTO, já existia (não é do SSO) — CORRIGIDO em 09/10/2026:** as policies "Users can
  insert/update their own subscription" (20251117112422) deixavam qualquer aluno se dar um plano
  pago pela API pública. Ao conferir quem grava, apareceu que a `claim-referral-rewards` dependia
  delas (usava o JWT do aluno) e uma segunda porta: "Users can update their own rewards" deixava o
  aluno reescrever a recompensa (`reward_description = '3650 dias'`, `claimed = false`) e resgatar.
  Agora é a migração `20261009120000_security_subscriptions_no_self_service.sql` + a função
  corrigida (ver §9).
- **Bugs que já existiam (não corrigidos, fora do escopo):** `check-referral-conversion`,
  `guru-webhook` (linha ~820) e `fix-family-group` ainda gravam `stripe_*` em `subscriptions`, e
  essas colunas foram removidas em 20260918210000: esses trechos falham. A
  `claim-referral-rewards` já foi limpa. O `apply-referral-code` grava `referral_rewards` e
  `referral_program` de outra pessoa com o JWT do aluno, o que a RLS recusa: os "7 dias" do código
  de indicação não são criados. Corrigir isso libera Premium grátis, então é decisão de negócio.
- Papel de admin: `user_roles` só aceita insert/delete de admin; não achei caminho de autopromoção.
- `package.json` ganhou `vitest` e `jose` (só desenvolvimento) e o script `test`; o `bun.lock`
  não foi atualizado (o deploy usa `npm ci`).

## 8. Revisão de segurança (09/10/2026)

Conferido: ID token (assinatura RS256 fixa, JWKS com rotação, iss, aud, azp, exp, iat, nonce,
`email_verified`, `sid`), state/PKCE de uso único, destino depois do login (só mesma origem e
dentro de `/admin`; `//evil`, `/\evil`, codificados, `javascript:` caem em `/admin`), logout token
(evento, sem nonce, iat ≤ 5 min, sid/sub), CORS só da origem da SPA, funções SQL `SECURITY DEFINER`
com `search_path` fixo e execução só para `service_role`, interruptores com padrão seguro.

Corrigido nesta revisão:
- **Sessões abertas sem o Hub continuavam valendo** depois que o admin passava a entrar pelo Hub
  (ex.: alguém que entrou com a senha antes da troca, ou por um link de "Esqueci a senha"). Agora
  cada login pelo Hub (com `HUB_SSO_LOCK_PASSWORD` ligado) encerra as sessões Supabase dessa pessoa
  que não vieram do Hub (`hub_sso_end_local_sessions`).
- O retorno do Hub com `iss` de outro emissor é recusado (RFC 9207); o código sai da barra de
  endereço antes da troca; a tela de erro não repete texto livre vindo do link (`?error=`).

Era a decisão pendente: o Supabase Auth aceitava **"Esqueci a senha" / link mágico** pela anon key
pública, e quem controlasse a caixa de e-mail de um admin abria uma sessão de admin sem o TOTP do
Hub. **Preparado em 09/10/2026, não ligado:** o *Custom Access Token Hook*
`hub_sso_access_token_hook` e o guarda das Edge Functions. Para ligar e desligar, ver §9.3.

## 9. Correções de segurança e fechamento do "Esqueci a senha" (09/10/2026)

### 9.1 Ordem das migrações deste branch

O `supabase db push` aplica nesta ordem (todas idempotentes, nenhuma migração antiga foi editada):

1. `20261008230000_hub_sso.sql` — SSO
2. `20261008230100_hub_sso_role_guard.sql` — SSO
3. `20261009090000_hub_sso_end_local_sessions.sql` — SSO
4. `20261009120000_security_subscriptions_no_self_service.sql` — **correção de segurança, independe do SSO** (antes dela, publicar a função `claim-referral-rewards` deste branch)
5. `20261009130000_hub_sso_access_token_hook.sql` — **só cria** as funções do hook (precisa das do SSO). Sem
   o hook ligado, nada muda.

### 9.2 O que pode ir para produção já, sem o SSO

- **`20261009120000_security_subscriptions_no_self_service.sql` — pode aplicar já, sozinha, DEPOIS
  de publicar a função `claim-referral-rewards` deste branch.** Remove as policies que deixavam o
  aluno inserir/alterar a própria linha de `subscriptions` (plano pago de graça) e alterar as
  próprias `referral_rewards` (segunda porta: a função de resgate transforma o texto da
  recompensa em dias de Premium). A `claim-referral-rewards` antiga fazia as consultas com o JWT
  do aluno e dependia dessas policies; a nova usa o service role (e marca a recompensa como
  resgatada antes de aplicar, então duas chamadas ao mesmo tempo não somam os dias duas vezes).
  Continua funcionando: leitura da própria assinatura e das recompensas, o "Reativar" da tela de
  admin, `guru-webhook`, `check-subscription`, `change-own-subscription`,
  `admin-change-subscription`, `check-referral-conversion`, `expire-subscriptions`, o cadastro
  (`initialize_free_subscription`).

Todas foram testadas no PostgreSQL local: o ataque funciona antes e é barrado depois, os caminhos
legítimos continuam gravando, e aplicar duas vezes não quebra nada.

### 9.3 Hook que fecha o "Esqueci a senha" para admins (preparado, NÃO ligado)

**O que faz.** O Supabase Auth chama `public.hub_sso_access_token_hook` antes de emitir qualquer
token (login e renovação). Para quem tem papel gerenciado pelo Hub (`admin` (`user_roles`); a função
`hub_sso_hook_roles()` precisa bater com o segredo `HUB_SSO_ALLOWED_ROLES`):

- sessão aberta pelo Hub: o token sai normal;
- sessão que **não** veio do Hub, aberta por senha, link de "Esqueci a senha", cadastro, convite,
  troca de e-mail, ou a **renovação** dela: **recusada** ("Quem administra entra pelo Hub");
- sessão encerrada no Hub: recusada;
- link mágico: sai o token, marcado `hub_sso: "unlinked"`. O link do próprio Hub é igual a um link
  mandado por e-mail, então não dá para recusar na hora. Esse token **não tem poder de admin**
  (todas as checagens de papel no banco e o guarda das funções recusam) e não se renova. O Hub
  vincula a sessão dele antes de entregar ao navegador, então o login pelo Hub funciona.

Alunos, membros e quem não tem papel do Hub: nada muda. Com o hook desligado, nada muda para
ninguém. Se o hook tiver um erro interno, o login passa como "unlinked" (sem poder de admin), em
vez de travar todo mundo.

**Pré-requisitos:** SSO em produção e testado (§5), as migrações de §9.1 aplicadas e as funções
publicadas.

**Ligar:**
1. Dashboard do projeto `xcxxdzipwfmakypegqxb` › Authentication › Hooks (ou "Auth Hooks") ›
   **Customize Access Token (JWT) Claims hook** › Add/Enable.
2. Tipo **Postgres**, schema `public`, função `hub_sso_access_token_hook` › Save.
   (Não precisa mexer em permissões: a migração já deu `EXECUTE` só ao `supabase_auth_admin`.)
3. Teste logo em seguida, numa janela anônima:
   - Hub › lançador › Isesemind → cai no `/admin` logado. Deixe a aba aberta mais que o tempo do
     JWT (ou recarregue depois de alguns minutos): continua logado.
   - Em `/auth`, "Esqueci a senha" com o e-mail de um admin → o link do e-mail **não** abre sessão
     (mensagem do Hub).
   - Um aluno/membro entra com e-mail e senha normalmente.

**Desligar (rollback imediato):** mesma tela › desligar (ou remover) o hook. Vale na hora para os
próximos tokens; não precisa mexer no banco. Para remover as funções de vez (opcional, com o hook
desligado): `DROP FUNCTION public.hub_sso_access_token_hook(jsonb); DROP FUNCTION
public.hub_sso_hook_roles();`. A regra "unlinked" em `hub_sso_current_session_revoked()` pode
ficar: sem o hook, nenhum token tem essa marca.

**Emergência com o hook ligado:** desligue o hook **antes** de `HUB_SSO_ENABLED=false`; senão o
"Esqueci a senha" do admin continua recusado.

**Não pôr no `supabase/config.toml`** (`[auth.hook.custom_access_token]`): um `config push`
ligaria o hook sem o teste acima.

### 9.4 Edge Functions que conferem papel com o service role

O hook protege o que o banco confere com o JWT de quem chama. Funções que leem `user_roles` /
`is_admin` com a **service role** não veem esse JWT. Por isso o guarda
`supabase/functions/_shared/hub-sso/guard.ts` (igual nos três projetos) faz a mesma pergunta ao
banco **como quem chamou** (`rpc/hub_sso_current_session_revoked` com o JWT dela) e devolve 403
quando a sessão foi encerrada no Hub ou é uma sessão de admin sem o Hub. Se der erro, ele bloqueia
(por isso as funções vão para produção depois das migrações, como o workflow já faz).

Funções que ganharam o guarda (todas conferem papel com o service role): `admin-change-subscription`,
`admin-create-user`, `admin-delete-user`, `fix-escaped-html`, `fix-family-group`,
`generate-verso-resumido`, `notify-course-launch`, `send-renewal-offer`, `sync-pagarme-revenue`.
`resend-user-password` e `fix-significado-formatting` já conferiam com o JWT de quem chamou (a regra
do banco vale para elas).

### 9.5 O que continua de fora

- Um link mágico pedido por e-mail para o endereço de um admin ainda abre uma sessão **comum**
  (sem admin) até o JWT expirar, sem renovar. O próximo login dele pelo Hub encerra essa sessão.
- O hook só cobre os papéis de `hub_sso_hook_roles()`.
