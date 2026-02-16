
## Plano: Sistema de Controle de Inadimplência para GURU/Pagar.me

### Solução em 3 Frentes

#### **FRENTE 1: Correção Imediata - check-subscription**
Modificar a Edge Function `check-subscription` para BLOQUEAR acesso quando `current_period_end` já passou:

**Mudança no código:**
```typescript
// Verificar se o período expirou
if (localSub.current_period_end) {
  const periodEnd = new Date(localSub.current_period_end);
  const now = new Date();
  
  if (periodEnd < now && localSub.status === 'active') {
    // NOVA LÓGICA: Marcar como expirado automaticamente
    await supabaseAdmin
      .from('subscriptions')
      .update({ 
        status: 'expired',
        plan_name: 'Gratuito',
        updated_at: now.toISOString()
      })
      .eq('user_id', user.id);
    
    return {
      subscribed: false,  // BLOQUEADO!
      status: 'expired',
      plan_name: 'Gratuito',
      message: 'Período de assinatura expirado'
    };
  }
}
```

#### **FRENTE 2: Job Agendado para Expirar Assinaturas**
Criar nova Edge Function `expire-subscriptions` que roda periodicamente (cron job diário) para:
1. Buscar todas assinaturas onde `current_period_end < NOW()` e `status = 'active'`
2. Atualizar para `status = 'expired'` e `plan_name = 'Gratuito'`
3. Enviar email notificando o usuário

**Configuração do cron no Supabase:**
- Usar pg_cron ou invocar via serviço externo (Supabase não tem cron nativo)
- Alternativa: usar Supabase Database Functions com pg_cron extension

#### **FRENTE 3: Período de Graça (Opcional)**
Adicionar coluna `grace_period_days` na tabela `app_settings` para:
- Dar X dias extras após expiração antes de bloquear
- Útil para casos de atraso temporário no pagamento

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/check-subscription/index.ts` | Modificar para expirar automaticamente |
| `supabase/functions/expire-subscriptions/index.ts` | Criar nova função para job diário |
| Migração SQL | Adicionar função de limpeza e configuração de período de graça |

---

### Migração SQL Necessária

```sql
-- 1. Adicionar configuração de período de graça
INSERT INTO app_settings (key, value, category)
VALUES ('subscription_grace_period_days', '3', 'subscription')
ON CONFLICT (key) DO NOTHING;

-- 2. Corrigir assinaturas já expiradas
UPDATE subscriptions 
SET status = 'expired', 
    plan_name = 'Gratuito',
    updated_at = NOW()
WHERE status = 'active' 
  AND current_period_end < NOW()
  AND payment_gateway = 'guru';

-- 3. Criar função para expirar assinaturas automaticamente
CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grace_days INTEGER;
BEGIN
  -- Buscar período de graça configurado
  SELECT COALESCE((
    SELECT value::INTEGER 
    FROM app_settings 
    WHERE key = 'subscription_grace_period_days'
  ), 0) INTO grace_days;
  
  -- Expirar assinaturas que passaram do período + graça
  UPDATE subscriptions
  SET status = 'expired',
      plan_name = 'Gratuito',
      updated_at = NOW()
  WHERE status = 'active'
    AND current_period_end < (NOW() - (grace_days || ' days')::INTERVAL)
    AND payment_gateway = 'guru';
END;
$$;
```

---

### Edge Function: expire-subscriptions

Nova função que pode ser chamada manualmente ou via cron:

```typescript
// Busca assinaturas expiradas e atualiza
const { data: expiredSubs } = await supabase
  .from('subscriptions')
  .select('id, user_id, plan_name, current_period_end')
  .eq('status', 'active')
  .eq('payment_gateway', 'guru')
  .lt('current_period_end', new Date().toISOString());

for (const sub of expiredSubs) {
  // Atualizar para expirado
  await supabase
    .from('subscriptions')
    .update({ status: 'expired', plan_name: 'Gratuito' })
    .eq('id', sub.id);
  
  // Opcional: Enviar email de aviso
  await supabase.functions.invoke('send-expiration-email', {
    body: { userId: sub.user_id }
  });
}
```

---

### Como Executar o Job Diariamente

**Opção A: Invocação Externa (Recomendada)**
Usar um serviço como:
- **Cron-job.org** (gratuito)
- **EasyCron**
- **GitHub Actions**

Configurar para chamar:
```
POST https://wmwuirqdluzjdqtmfzsm.supabase.co/functions/v1/expire-subscriptions
Authorization: Bearer [ANON_KEY]
```

**Opção B: Verificação no Login**
Chamar a função de expiração sempre que o usuário fizer login (já implementado no check-subscription modificado)

---

### Configuração do Webhook no GURU/Pagar.me

Verificar no painel do GURU se os seguintes eventos estão configurados para enviar webhook:
1. `subscription_expired`
2. `subscription_overdue` 
3. `payment_failed`
4. `subscription_canceled`

URL do webhook: `https://wmwuirqdluzjdqtmfzsm.supabase.co/functions/v1/guru-webhook`

---

### Resultado Esperado

1. **Imediato**: 13 assinaturas expiradas serão bloqueadas
2. **Contínuo**: Qualquer assinatura que expirar será automaticamente bloqueada
3. **Período de graça**: 3 dias configuráveis antes do bloqueio total
4. **Reativação**: Quando o pagamento for feito, o webhook do GURU reativará automaticamente

---

### Ação Recomendada Adicional

No painel da **Pagar.me/GURU**, verificar:
- Se os webhooks de renovação estão configurados
- Se há tentativas de cobrança automática
- Se o endpoint do webhook está correto
