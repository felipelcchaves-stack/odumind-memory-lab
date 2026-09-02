# Erro no login: backend indisponível (não é bug de código)

## Diagnóstico verificado agora

- O status do backend (Lovable Cloud) retorna "ainda iniciando / aplicando mudanças" — não está `ACTIVE_HEALTHY`.
- Uma chamada direta ao serviço de autenticação (`/auth/v1/health`) respondeu **521 – Web server is down** (às 23:08 UTC), repetidas vezes.

Ou seja: o login falha porque as requisições de autenticação não chegam ao servidor. O código de login (`AuthContext.signIn`, `Auth.tsx`, `enforce-single-session`) não foi alterado e não é a causa.

## Plano de ação

1. Aguardar e reconferir o status do backend algumas vezes (a instância pode estar subindo sozinha).
2. Se continuar fora do ar / instável, solicitar aprovação e executar um **restart do backend**, depois confirmar que o serviço de autenticação responde 200 antes de qualquer outra ação.
3. Validar o login de ponta a ponta no preview após o backend voltar (login com uma conta de teste, checando também `enforce-single-session` e a validação de sessão).
4. Se o backend voltar saudável e o login ainda falhar, então sim investigar código: logs da função `enforce-single-session`, `useSessionValidation` e mensagens exatas de erro exibidas na tela.

## O que NÃO vou fazer

- Não vou alterar o fluxo de autenticação, remover a sessão única, nem mexer em RLS/policies para "contornar" uma indisponibilidade de infraestrutura.

## Nota

Se a indisponibilidade persistir por muito tempo mesmo após o restart, é caso de contatar o suporte da Lovable — é infraestrutura, não aplicação.
