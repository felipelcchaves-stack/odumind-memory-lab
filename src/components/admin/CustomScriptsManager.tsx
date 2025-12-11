import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Code, AlertTriangle, Copy, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ScriptSettings {
  custom_head_scripts: string;
  custom_body_scripts: string;
}

export function CustomScriptsManager() {
  const [scripts, setScripts] = useState<ScriptSettings>({
    custom_head_scripts: '',
    custom_body_scripts: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['custom_head_scripts', 'custom_body_scripts']);

      if (error) throw error;

      const scriptsData: ScriptSettings = {
        custom_head_scripts: '',
        custom_body_scripts: '',
      };

      data?.forEach((item) => {
        if (item.key === 'custom_head_scripts') {
          scriptsData.custom_head_scripts = item.value || '';
        } else if (item.key === 'custom_body_scripts') {
          scriptsData.custom_body_scripts = item.value || '';
        }
      });

      setScripts(scriptsData);
    } catch (error) {
      console.error('Error loading scripts:', error);
      toast.error('Erro ao carregar scripts');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof ScriptSettings, value: string) => {
    setScripts((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upsert both settings
      for (const [key, value] of Object.entries(scripts)) {
        const { error } = await supabase
          .from('app_settings')
          .upsert({
            key,
            value,
            category: 'tracking',
            description: key === 'custom_head_scripts' 
              ? 'Scripts JavaScript customizados para <head>' 
              : 'Scripts JavaScript customizados para <body>',
            is_public: true,
            is_sensitive: false,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });

        if (error) throw error;
      }

      toast.success('Scripts salvos com sucesso!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving scripts:', error);
      toast.error('Erro ao salvar scripts');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, snippetName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(snippetName);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const codeSnippets = {
    metaPixel: `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'SEU_PIXEL_ID_AQUI');
fbq('track', 'PageView');
</script>`,
    googleAnalytics: `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=SEU_ID_AQUI"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'SEU_ID_AQUI');
</script>`,
    tiktokPixel: `<!-- TikTok Pixel -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('SEU_PIXEL_ID_AQUI');
  ttq.page();
}(window, document, 'ttq');
</script>`,
    customEvent: `<!-- Exemplo de Evento Customizado -->
<script>
// Meta Pixel - Evento customizado
fbq('trackCustom', 'NomeDoEvento', {
  parametro1: 'valor1',
  parametro2: 'valor2'
});

// Google Analytics - Evento customizado
gtag('event', 'nome_do_evento', {
  parametro1: 'valor1',
  parametro2: 'valor2'
});

// TikTok - Evento customizado
ttq.track('NomeDoEvento', {
  parametro1: 'valor1'
});
</script>`,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Scripts JavaScript Customizados
          </CardTitle>
          <CardDescription>
            Adicione códigos JavaScript personalizados para tracking, pixels ou outras integrações.
            Os scripts serão executados em todas as páginas do site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Scripts incorretos podem afetar o funcionamento do site.
              Certifique-se de que o código está correto antes de salvar.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="head" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="head">Scripts no &lt;head&gt;</TabsTrigger>
              <TabsTrigger value="body">Scripts no &lt;body&gt;</TabsTrigger>
            </TabsList>

            <TabsContent value="head" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="head-scripts">
                  Scripts para o &lt;head&gt;
                  <Badge variant="secondary" className="ml-2">Carrega primeiro</Badge>
                </Label>
                <Textarea
                  id="head-scripts"
                  placeholder="Cole aqui os scripts que devem ser carregados no <head> da página..."
                  value={scripts.custom_head_scripts}
                  onChange={(e) => handleChange('custom_head_scripts', e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Ideal para: Meta Pixel, Google Analytics, scripts de tracking que precisam carregar cedo.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="body" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="body-scripts">
                  Scripts para o &lt;body&gt;
                  <Badge variant="outline" className="ml-2">Carrega depois</Badge>
                </Label>
                <Textarea
                  id="body-scripts"
                  placeholder="Cole aqui os scripts que devem ser carregados no final do <body>..."
                  value={scripts.custom_body_scripts}
                  onChange={(e) => handleChange('custom_body_scripts', e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Ideal para: Chatbots, widgets, scripts que não precisam carregar imediatamente.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} disabled={!hasChanges || saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Scripts
          </Button>
        </CardContent>
      </Card>

      {/* Code Snippets Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Códigos de Referência
          </CardTitle>
          <CardDescription>
            Copie e cole estes códigos nos campos acima, substituindo os IDs pelos seus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(codeSnippets).map(([key, code]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="capitalize">
                  {key === 'metaPixel' && 'Meta Pixel (Facebook/Instagram)'}
                  {key === 'googleAnalytics' && 'Google Analytics 4'}
                  {key === 'tiktokPixel' && 'TikTok Pixel'}
                  {key === 'customEvent' && 'Exemplo de Evento Customizado'}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(code, key)}
                  className="gap-1"
                >
                  {copiedSnippet === key ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  Copiar
                </Button>
              </div>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-[150px] overflow-y-auto">
                <code>{code}</code>
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
