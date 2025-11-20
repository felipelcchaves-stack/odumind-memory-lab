# 📊 Configuração de Pixel Tracking

Este documento explica como configurar os pixels de rastreamento para Meta (Facebook/Instagram), Google Analytics 4, TikTok e LinkedIn.

## 🎯 Pixels Implementados

### 1. Meta Pixel (Facebook/Instagram)

**Onde configurar:** `index.html` - linha 30

```javascript
// Substitua YOUR_PIXEL_ID pelo seu Pixel ID real
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
```

**Como obter:**
1. Acesse o [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Crie um novo Pixel ou use um existente
3. Copie o Pixel ID (formato: 15-17 dígitos)

**Eventos rastreados:**
- ✅ PageView (visualização de página)
- ✅ CompleteRegistration (cadastro)
- ✅ InitiateCheckout (início do checkout)
- ✅ Purchase (compra concluída)
- ✅ AddToCart (adição ao carrinho)
- ✅ ViewContent (visualização de conteúdo)

---

### 2. Google Analytics 4

**Onde configurar:** `index.html` - linha 42

```javascript
// Substitua G-XXXXXXXXXX pelo seu Measurement ID
gtag('config', 'G-XXXXXXXXXX');
```

**Como obter:**
1. Acesse [Google Analytics](https://analytics.google.com/)
2. Crie uma propriedade GA4
3. Configure um Web Stream
4. Copie o Measurement ID (formato: G-XXXXXXXXXX)

**Eventos rastreados:**
- ✅ page_view
- ✅ sign_up
- ✅ begin_checkout
- ✅ purchase
- ✅ add_to_cart
- ✅ view_item

---

### 3. TikTok Pixel

**Onde configurar:** `index.html` - linha 49

```javascript
// Substitua YOUR_PIXEL_CODE pelo seu Pixel Code
ttq.load('YOUR_PIXEL_CODE');
ttq.page();
```

**Como obter:**
1. Acesse o [TikTok Ads Manager](https://ads.tiktok.com/)
2. Vá em Assets → Events
3. Crie um novo Pixel
4. Copie o Pixel Code

**Eventos rastreados:**
- ✅ PageView
- ✅ CompleteRegistration
- ✅ InitiateCheckout
- ✅ PlaceAnOrder
- ✅ AddToCart
- ✅ ViewContent

---

### 4. LinkedIn Insight Tag

**Onde configurar:** `index.html` - linha 59

```javascript
// Substitua YOUR_PARTNER_ID pelo seu Partner ID
_linkedin_partner_id = "YOUR_PARTNER_ID";
```

**Como obter:**
1. Acesse o [LinkedIn Campaign Manager](https://www.linkedin.com/campaignmanager/)
2. Vá em Account Assets → Insight Tag
3. Copie o Partner ID

**Eventos rastreados:**
- ✅ PageView
- ✅ Conversão de Signup
- ✅ Conversão de Purchase

---

## 🚀 Como Usar no Código

O hook `usePixelTracking` está disponível para rastrear eventos em toda a aplicação:

```typescript
import { usePixelTracking } from '@/hooks/usePixelTracking';

function Component() {
  const { trackSignUp, trackPurchase, trackInitiateCheckout } = usePixelTracking();

  const handleSignUp = () => {
    // Seu código de cadastro
    trackSignUp('email');
  };

  const handlePurchase = () => {
    // Seu código de compra
    trackPurchase(49.90, 'BRL', 'Premium');
  };

  return (
    // Seu componente
  );
}
```

---

## 📍 Onde Adicionar Tracking

### Já Implementado (Automático):
- ✅ PageView - toda página visitada
- ✅ ExitIntentPopup - captura de email

### Para Implementar (Manual):

**1. Página de Auth (`src/pages/Auth.tsx`)**
```typescript
const { trackSignUp } = usePixelTracking();

// Após signup bem-sucedido
trackSignUp('email');
```

**2. Página de Subscription (`src/pages/Subscription.tsx`)**
```typescript
const { trackInitiateCheckout, trackAddToCart } = usePixelTracking();

// Ao clicar para assinar
trackAddToCart(planName, planValue);
trackInitiateCheckout(planName, planValue);
```

**3. Página de Success (`src/pages/Success.tsx`)**
```typescript
const { trackPurchase } = usePixelTracking();

// Após pagamento confirmado
trackPurchase(49.90, 'BRL', 'Premium');
```

**4. Pricing Section (`src/components/Pricing.tsx`)**
```typescript
const { trackViewContent } = usePixelTracking();

// Ao visualizar plano
trackViewContent(planName, 'pricing');
```

---

## ✅ Checklist de Implementação

- [ ] Obter Pixel IDs de todos os canais
- [ ] Substituir placeholders no `index.html`
- [ ] Descomentar linhas de tracking no `index.html`
- [ ] Adicionar tracking em Auth.tsx (signup)
- [ ] Adicionar tracking em Subscription.tsx (checkout)
- [ ] Adicionar tracking em Success.tsx (purchase)
- [ ] Testar eventos no Facebook Events Manager
- [ ] Testar eventos no Google Analytics Realtime
- [ ] Testar eventos no TikTok Events Manager
- [ ] Configurar conversões personalizadas (opcional)

---

## 🧪 Como Testar

### Meta Pixel
1. Instale a [Meta Pixel Helper Extension](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. Navegue pelo site
3. Veja os eventos sendo disparados no extension

### Google Analytics 4
1. Acesse Google Analytics
2. Vá em Realtime → Events
3. Navegue pelo site e veja eventos em tempo real

### TikTok Pixel
1. Acesse TikTok Events Manager
2. Vá em Events → Test Events
3. Digite a URL do site e teste eventos

### LinkedIn
1. Acesse Campaign Manager
2. Vá em Account Assets → Insight Tag
3. Verifique status "Active" e "Seeing data"

---

## 📝 Notas Importantes

1. **GDPR/LGPD**: Considere adicionar um banner de cookies para conformidade com LGPD
2. **Performance**: Os scripts são carregados de forma assíncrona para não impactar a performance
3. **Debugging**: Os eventos têm `console.log()` para facilitar debug em desenvolvimento
4. **Conversões**: Configure conversões personalizadas em cada plataforma para melhor tracking de ROI

---

## 🔗 Links Úteis

- [Meta Pixel Documentation](https://developers.facebook.com/docs/meta-pixel/)
- [Google Analytics 4 Setup](https://support.google.com/analytics/answer/9304153)
- [TikTok Pixel Guide](https://ads.tiktok.com/help/article/standard-events-parameters)
- [LinkedIn Insight Tag](https://www.linkedin.com/help/lms/answer/a417880)
