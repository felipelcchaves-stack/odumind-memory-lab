# Como Configurar um Usuário como Administrador

Para dar acesso administrativo a um usuário no sistema Isesemind, você precisa adicionar o papel de "admin" na tabela `user_roles` no banco de dados.

## Passo a Passo

### 1. Acesse o Lovable Cloud (Backend)

Clique no botão "View Backend" no painel do Lovable para acessar o painel de administração do banco de dados.

### 2. Execute o SQL

Na seção de SQL do backend, execute o seguinte comando substituindo `USER_EMAIL` pelo email do usuário que você deseja tornar admin:

```sql
-- Primeiro, obtenha o ID do usuário pelo email
SELECT id FROM auth.users WHERE email = 'USER_EMAIL';

-- Use o ID retornado para inserir o role de admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_AQUI', 'admin');
```

### Exemplo Completo

```sql
-- Exemplo: tornar admin@isesemind.com um administrador

-- 1. Buscar o ID do usuário
SELECT id FROM auth.users WHERE email = 'admin@isesemind.com';

-- Suponha que retornou: 123e4567-e89b-12d3-a456-426614174000

-- 2. Inserir o role de admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin');
```

## Verificar se Funcionou

1. Faça logout e login novamente com o usuário
2. No Dashboard, você deve ver um botão "Admin" no canto superior direito
3. Clique nele para acessar o painel administrativo

## Remover Acesso Admin

Para remover o acesso administrativo:

```sql
DELETE FROM public.user_roles 
WHERE user_id = 'USER_ID_AQUI' 
AND role = 'admin';
```

## Segurança

⚠️ **IMPORTANTE**: 
- Apenas conceda acesso admin a usuários confiáveis
- O papel de admin permite:
  - Criar, editar e excluir qualquer Odu
  - Fazer upload em massa
  - Ver histórico de edições
  - Gerenciar todos os aspectos do conteúdo

## Troubleshooting

### "Acesso negado" mesmo após adicionar role

1. Verifique se o ID do usuário está correto
2. Faça logout e login novamente
3. Limpe o cache do navegador
4. Verifique se o registro foi criado:
   ```sql
   SELECT * FROM public.user_roles WHERE user_id = 'USER_ID_AQUI';
   ```

### Não consigo ver o botão Admin

- Certifique-se de que o usuário está logado
- Verifique se o role foi adicionado corretamente
- Tente fazer logout e login novamente
