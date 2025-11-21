# 📊 Pixel Tracking Setup Guide - V2.2

Este guia detalha a implementação completa do sistema de tracking de pixels (Meta, Google Analytics 4, TikTok, LinkedIn) no Isesemind.

## ✅ Status da Implementação V2.2

### Implementado:
- ✅ Carregamento dinâmico de pixels do banco de dados (app_settings)
- ✅ Meta Pixel (Facebook/Instagram)
- ✅ Google Analytics 4
- ✅ TikTok Pixel
- ✅ LinkedIn Insight Tag
- ✅ Eventos customizados (achievement_unlocked, referral_used, etc.)
- ✅ Hook useTrackingEvents para eventos avançados
- ✅ Integração completa com fluxos do app

### Novo Sistema de Tracking:

Os pixels são carregados **dinamicamente** do banco de dados através da tabela `app_settings`. Isso permite ativar/desativar tracking e atualizar IDs sem alterar código.

---

## 🗄️ Configuração no Banco de Dados

### Tabela: `app_settings`

Os pixels já estão configurados para carregar dinamicamente. Para ativar:

1. Acesse **Lovable Cloud** → **Database** → **app_settings**
2. Configure os seguintes registros:

| key | value | category | is_public | description |
|-----|-------|----------|-----------|-------------|
| tracking_enabled | `true` | tracking | ✅ | Enable/disable all tracking pixels |
| meta_pixel_id | `SEU_ID` | tracking | ✅ | Facebook/Instagram Pixel ID |
| google_analytics_id | `G-XXXXXX` | tracking | ✅ | Google Analytics 4 Measurement ID |
| tiktok_pixel_id | `SEU_ID` | tracking | ✅ | TikTok Pixel Code |
| linkedin_partner_id | `SEU_ID` | tracking | ✅ | LinkedIn Partner ID |

### Como Obter os IDs:

#### 1. **Meta Pixel (Facebook/Instagram)**
- Acesse: [Meta Events Manager](https://business.facebook.com/events_manager)
- Copie o Pixel ID (formato: `123456789012345`)
- Cole no campo `value` onde `key = 'meta_pixel_id'`

#### 2. **Google Analytics 4**
- Acesse: [Google Analytics](https://analytics.google.com)
- Admin → Data Streams → Copie o Measurement ID (formato: `G-XXXXXXXXXX`)
- Cole no campo `value` onde `key = 'google_analytics_id'`

#### 3. **TikTok Pixel**
- Acesse: [TikTok Ads Manager](https://ads.tiktok.com)
- Assets → Events → Copie o Pixel Code (formato: `ABCDEFGHIJKLMNOP`)
- Cole no campo `value` onde `key = 'tiktok_pixel_id'`

#### 4. **LinkedIn Insight Tag**
- Acesse: [LinkedIn Campaign Manager](https://www.linkedin.com/campaignmanager)
- Account Assets → Insight Tag → Copie o Partner ID (formato: `1234567`)
- Cole no campo `value` onde `key = 'linkedin_partner_id'`

---

## 📈 Eventos Rastreados

### Eventos Padrão (usePixelTracking):
- `page_view` - Visualização de página (automático)
- `sign_up` - Cadastro de novo usuário
- `purchase` - Compra/assinatura confirmada
- `begin_checkout` - Início do checkout
- `add_to_cart` - Visualização de plano
- `view_item` - Visualização de conteúdo

### Eventos Customizados (useTrackingEvents - V2.2):
- ✨ `achievement_unlocked` - Conquista desbloqueada/compartilhada
- ✨ `referral_used` - Código de indicação utilizado
- ✨ `study_session_completed` - Sessão de estudo finalizada
- ✨ `odu_memorized` - Odu memorizado
- ✨ `streak_milestone` - Marco de streak alcançado

---

## 🔧 Uso no Código

### Hook: usePixelTracking
```typescript
import { usePixelTracking } from '@/hooks/usePixelTracking';

const { trackSignUp, trackPurchase, trackViewContent } = usePixelTracking();

// Exemplo: rastrear cadastro
trackSignUp('email');

// Exemplo: rastrear compra
trackPurchase(49.90, 'BRL', 'Premium');
```

### Hook: useTrackingEvents (Novo!)
```typescript
import { useTrackingEvents } from '@/hooks/useTrackingEvents';

const { 
  trackAchievementUnlocked, 
  trackReferralUsed,
  trackOduMemorized 
} = useTrackingEvents();

// Exemplo: rastrear conquista
trackAchievementUnlocked('Primeiro Odu Memorizado', 50);

// Exemplo: rastrear indicação
trackReferralUsed('MARIA2024');

// Exemplo: rastrear Odu memorizado
trackOduMemorized(1, 'Eji Ogbe');
```

---

## 📍 Onde os Eventos São Rastreados

### ✅ Já Implementado:

#### 1. **Auth.tsx**
- `trackSignUp()` - Quando usuário cria conta (linha 103)

#### 2. **Success.tsx**
- `trackPurchase()` - Quando pagamento é confirmado (linhas 19-35)

#### 3. **ShareAchievementDialog.tsx** (V2.2)
- `trackAchievementUnlocked()` - Quando conquista é compartilhada (linhas 84, 89)

### 🎯 Para Implementar Futuramente:

#### 4. **Subscription.tsx**
```typescript
const { trackInitiateCheckout, trackAddToCart } = usePixelTracking();

// Ao clicar em "Assinar"
trackInitiateCheckout(planName, planValue);
```

#### 5. **Referral.tsx**
```typescript
const { trackReferralUsed } = useTrackingEvents();

// Quando código é aplicado
trackReferralUsed(referralCode);
```

#### 6. **StudySession.tsx**
```typescript
const { trackStudySessionCompleted } = useTrackingEvents();

// Ao finalizar sessão
trackStudySessionCompleted(duration, cardsStudied, accuracy);
```

---

## 🧪 Como Testar

### 1. Meta Pixel Helper
- Instale: [Meta Pixel Helper Extension](https://chrome.google.com/webstore/detail/meta-pixel-helper/)
- Navegue pelo app
- Verifique eventos no ícone da extensão

### 2. Google Analytics 4
- Abra: [Google Analytics Realtime](https://analytics.google.com/analytics/web/#/realtime)
- Execute ações no app
- Veja eventos em tempo real

### 3. TikTok Events Manager
- Acesse: [TikTok Events Manager](https://ads.tiktok.com/help/article)
- Test Events → Verifique eventos recebidos

### 4. LinkedIn Insight Tag
- Use: [LinkedIn Insight Tag Helper](https://www.linkedin.com/help/lms/answer/a427660)

### 5. Console do Navegador
```javascript
// Verifique se os pixels foram carregados
console.log(window.fbq); // Meta Pixel
console.log(window.gtag); // Google Analytics
console.log(window.ttq); // TikTok
console.log(window.lintrk); // LinkedIn
```

---

## ⚠️ Notas Importantes

### GDPR/LGPD Compliance
- ⚠️ **IMPORTANTE**: Adicione um banner de consentimento de cookies antes do lançamento
- Respeite opt-out do usuário
- Documente na Política de Privacidade

### Performance
- Pixels carregam **assincronamente** via Edge Function
- Não bloqueiam renderização da página
- Fallback automático se Edge Function falhar
- Cache de 5 minutos para settings

### Debugging
- Logs de console mostram quais pixels foram carregados:
  ```
  Meta Pixel loaded: 123456789012345
  Google Analytics loaded: G-XXXXXXXXXX
  TikTok Pixel loaded: ABCDEFGHIJKLMNOP
  LinkedIn Insight Tag loaded: 1234567
  ```

### Conversões
- Configure conversões personalizadas em cada plataforma
- Use valores monetários reais para ROI tracking
- Acompanhe funil completo: View → Add to Cart → Purchase

---

## 🚀 Recursos V2.2 Completos

### ✅ Implementado:

#### 1. **Ranking de Indicadores** (`TopReferrers.tsx`)
- Top 10 embaixadores com ranking
- Medals para top 3 (🥇🥈🥉)
- Dados reais do Supabase
- Contadores de indicações e conversões

#### 2. **Prova Social Dinâmica** (`DynamicSocialProof.tsx`)
- Contadores em tempo real:
  - 👥 Estudantes ativos
  - 📖 Odu memorizados hoje
  - 📈 Taxa de conclusão
  - ⭐ Média de dias
- Integração com banco de dados
- Loading states elegantes

#### 3. **Pixel Tracking Completo**
- Carregamento dinâmico via DB
- 4 plataformas integradas
- Eventos customizados V2.2
- Admin pode gerenciar IDs sem código
- Edge Function: `get-public-settings`

#### 4. **Landing Page Atualizada** (`Index.tsx`)
- Nova ordem otimizada:
  1. Hero
  2. **Prova Social Dinâmica** (novo)
  3. Testimonials
  4. **Top Referrers** (novo)
  5. Features
  6. Comparison
  7. Learning Path
  8. FAQ
  9. Pricing
  10. Urgency
  11. Exit Intent Popup

---

## 📊 Métricas de Sucesso V2.2

### KPIs para Acompanhar:

#### Conversão:
- Taxa de conversão landing: **5% → 8%**
- CAC (Custo de Aquisição): **R$ 50 → R$ 30**

#### Viralidade:
- Indicações por usuário: **0 → 2.5**
- K-factor de viralidade: **0 → 1.2**

#### Engajamento:
- Conquistas compartilhadas por usuário: **0 → 3**
- Alcance social: **+500% em 30 dias**

---

## 📚 Documentação Oficial

- [Meta Pixel Documentation](https://developers.facebook.com/docs/meta-pixel)
- [Google Analytics 4 Guide](https://support.google.com/analytics/answer/9304153)
- [TikTok Pixel Setup](https://ads.tiktok.com/help/article/standard-mode-pixel-set-up)
- [LinkedIn Insight Tag](https://www.linkedin.com/help/lms/answer/a418880)
- [Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)

---

## 🎯 Próximos Passos

1. ✅ **Obter Pixel IDs** - Configure na tabela app_settings
2. ✅ **Testar Eventos** - Use ferramentas de debug de cada plataforma
3. ⏭️ **Implementar V2.3** - Sistema de Rituais
4. ⏭️ **Implementar V3.0** - Planos Anuais + Upsells
5. ⏭️ **Implementar V3.1** - Sistema de Missões Diárias