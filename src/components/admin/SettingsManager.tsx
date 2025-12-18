import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAppSettings } from '@/hooks/useAppSettings';
import { usePlanVisibilityAdmin } from '@/hooks/usePlanVisibility';
import { PLANS } from '@/config/plans';
import { Loader2, Save, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Code, CreditCard, Megaphone, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { CustomScriptsManager } from './CustomScriptsManager';

export function SettingsManager() {
  const { settings, loading, updateSetting, getSettingsByCategory } = useAppSettings();
  const { visibility, loading: visibilityLoading, saving: visibilitySaving, updateVisibility } = usePlanVisibilityAdmin();
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const trackingSettings = getSettingsByCategory('tracking');
  const marketingSettings = getSettingsByCategory('marketing');

  // Estados para o exit popup
  const [exitPopupEnabled, setExitPopupEnabled] = useState(true);
  const [exitPopupDiscount, setExitPopupDiscount] = useState('20');
  const [exitPopupTitle, setExitPopupTitle] = useState('Espera! 🎁');
  const [exitPopupDescription, setExitPopupDescription] = useState('Antes de ir, que tal **{discount}% de desconto** no seu primeiro mês?');
  const [exitPopupButtonText, setExitPopupButtonText] = useState('Quero Meu Desconto de {discount}%');
  const [exitPopupDelay, setExitPopupDelay] = useState('3');
  const [savingMarketing, setSavingMarketing] = useState(false);

  // Carregar valores do marketing ao iniciar
  useEffect(() => {
    if (marketingSettings.length > 0) {
      marketingSettings.forEach(setting => {
        switch (setting.key) {
          case 'exit_popup_enabled':
            setExitPopupEnabled(setting.value === 'true');
            break;
          case 'exit_popup_discount_percent':
            setExitPopupDiscount(setting.value || '20');
            break;
          case 'exit_popup_title':
            setExitPopupTitle(setting.value || 'Espera! 🎁');
            break;
          case 'exit_popup_description':
            setExitPopupDescription(setting.value || 'Antes de ir, que tal **{discount}% de desconto** no seu primeiro mês?');
            break;
          case 'exit_popup_button_text':
            setExitPopupButtonText(setting.value || 'Quero Meu Desconto de {discount}%');
            break;
          case 'exit_popup_delay_seconds':
            setExitPopupDelay(setting.value || '3');
            break;
        }
      });
    }
  }, [marketingSettings]);

  const handleChange = (key: string, value: string) => {
    setEditingValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    const value = editingValues[key];
    if (value === undefined) return;

    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await updateSetting(key, value);
      setEditingValues(prev => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
    } catch (error) {
      // Error already handled in hook
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleSensitive = (key: string) => {
    setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePlanVisibilityChange = async (planId: string, isVisible: boolean) => {
    const success = await updateVisibility(planId, isVisible);
    if (success) {
      toast.success(`Plano ${planId} ${isVisible ? 'ativado' : 'desativado'} com sucesso`);
    } else {
      toast.error('Erro ao atualizar visibilidade do plano');
    }
  };

  const handleSaveMarketingSettings = async () => {
    setSavingMarketing(true);
    try {
      await Promise.all([
        updateSetting('exit_popup_enabled', String(exitPopupEnabled)),
        updateSetting('exit_popup_discount_percent', exitPopupDiscount),
        updateSetting('exit_popup_title', exitPopupTitle),
        updateSetting('exit_popup_description', exitPopupDescription),
        updateSetting('exit_popup_button_text', exitPopupButtonText),
        updateSetting('exit_popup_delay_seconds', exitPopupDelay),
      ]);
      toast.success('Configurações do popup salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingMarketing(false);
    }
  };

  const testPixel = (pixelType: string, pixelId: string) => {
    if (!pixelId) {
      toast.error('Configure o ID do pixel primeiro');
      return;
    }

    const urls: Record<string, string> = {
      meta_pixel_id: 'https://www.facebook.com/events_manager2/list/pixel/',
      google_analytics_id: 'https://analytics.google.com/',
      tiktok_pixel_id: 'https://ads.tiktok.com/i18n/pixel',
      linkedin_partner_id: 'https://www.linkedin.com/campaignmanager/accounts',
    };

    const url = urls[pixelType];
    if (url) {
      window.open(url, '_blank');
      toast.info('Verifique o pixel no dashboard da plataforma');
    }
  };

  const getPixelStatus = (key: string, value: string | null) => {
    if (!value || value.trim() === '') {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Não configurado</Badge>;
    }
    return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" />Ativo</Badge>;
  };

  const getPixelDocs = (key: string) => {
    const docs: Record<string, string> = {
      meta_pixel_id: 'https://www.facebook.com/business/help/952192354843755',
      google_analytics_id: 'https://support.google.com/analytics/answer/9539598',
      tiktok_pixel_id: 'https://ads.tiktok.com/help/article/pixel',
      linkedin_partner_id: 'https://www.linkedin.com/help/lms/answer/a427660',
    };
    return docs[key];
  };

  // Formatar preview com placeholder substituído
  const formatWithDiscount = (text: string) => {
    return text.replace(/{discount}/g, exitPopupDiscount);
  };

  if (loading || visibilityLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="pixels">IDs dos Pixels</TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <Code className="w-4 h-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Marketing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Visibilidade dos Planos</CardTitle>
              <CardDescription>
                Controle quais planos aparecem na landing page e na página de assinatura.
                As mudanças são aplicadas instantaneamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {PLANS.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{plan.name}</h4>
                      <Badge variant={visibility[plan.id] ? "default" : "secondary"}>
                        {visibility[plan.id] ? 'Visível' : 'Oculto'}
                      </Badge>
                      {plan.popular && (
                        <Badge variant="outline" className="text-primary border-primary">
                          Mais Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <p className="text-sm font-medium">{plan.price}/mês</p>
                  </div>
                  <Switch
                    checked={visibility[plan.id] ?? true}
                    onCheckedChange={(checked) => handlePlanVisibilityChange(plan.id, checked)}
                    disabled={visibilitySaving}
                  />
                </div>
              ))}

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">💡 Dicas de uso:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Durante o lançamento, deixe apenas o plano <strong>Awo</strong> visível</li>
                  <li>O plano Gratuito pode ser ocultado para forçar conversão</li>
                  <li>O plano Egbe (Família) pode ser ativado posteriormente</li>
                  <li>As mudanças são instantâneas, sem necessidade de deploy</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pixels">
          <Card>
            <CardHeader>
              <CardTitle>Pixels de Tracking</CardTitle>
              <CardDescription>
                Configure os IDs dos pixels para rastreamento de conversões e análise de usuários.
                Os pixels serão carregados automaticamente em todas as páginas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {trackingSettings.map((setting) => {
                const currentValue = editingValues[setting.key] ?? setting.value ?? '';
                const hasChanges = editingValues[setting.key] !== undefined;
                const isSaving = saving[setting.key];
                const isShowing = showSensitive[setting.key];

                return (
                  <div key={setting.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Label htmlFor={setting.key} className="text-base font-medium">
                          {setting.description}
                        </Label>
                        {getPixelStatus(setting.key, setting.value)}
                      </div>
                      <div className="flex items-center gap-2">
                        {setting.key !== 'tracking_enabled' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => testPixel(setting.key, currentValue)}
                              disabled={!currentValue}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Testar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(getPixelDocs(setting.key), '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Documentação
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={setting.key}
                          type={setting.is_sensitive && !isShowing ? 'password' : 'text'}
                          value={currentValue}
                          onChange={(e) => handleChange(setting.key, e.target.value)}
                          placeholder={`Digite o ${setting.description}`}
                          className="font-mono text-sm"
                        />
                        {setting.is_sensitive && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => toggleSensitive(setting.key)}
                          >
                            {isShowing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                      <Button
                        onClick={() => handleSave(setting.key)}
                        disabled={!hasChanges || isSaving}
                        variant={hasChanges ? "default" : "outline"}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {setting.key !== 'tracking_enabled' && (
                      <p className="text-xs text-muted-foreground">
                        Código do pixel: <code className="font-mono bg-muted px-1 py-0.5 rounded">{setting.key}</code>
                      </p>
                    )}

                    {setting.key === 'tracking_enabled' && (
                      <p className="text-xs text-muted-foreground">
                        Ative ou desative todos os pixels de tracking de uma vez. Use "true" para ativar ou "false" para desativar.
                      </p>
                    )}

                    <Separator />
                  </div>
                );
              })}

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">📊 Como funciona:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Os pixels são carregados automaticamente em todas as páginas</li>
                  <li>Os eventos são rastreados automaticamente (PageView, SignUp, Purchase, etc.)</li>
                  <li>As alterações são aplicadas em tempo real sem necessidade de redeploy</li>
                  <li>Todas as mudanças são registradas no log de auditoria</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scripts">
          <CustomScriptsManager />
        </TabsContent>

        <TabsContent value="marketing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Exit Intent Popup
              </CardTitle>
              <CardDescription>
                Configure o popup de desconto que aparece quando o usuário tenta sair da landing page.
                Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{discount}'}</code> para inserir o percentual dinamicamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Switch para habilitar/desabilitar */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Popup Habilitado</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, o popup aparece quando o usuário tenta sair da página
                  </p>
                </div>
                <Switch
                  checked={exitPopupEnabled}
                  onCheckedChange={setExitPopupEnabled}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Percentual de desconto */}
                <div className="space-y-2">
                  <Label htmlFor="discount">Percentual de Desconto (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="1"
                    max="100"
                    value={exitPopupDiscount}
                    onChange={(e) => setExitPopupDiscount(e.target.value)}
                    placeholder="20"
                  />
                </div>

                {/* Delay em segundos */}
                <div className="space-y-2">
                  <Label htmlFor="delay">Delay (segundos)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min="1"
                    max="60"
                    value={exitPopupDelay}
                    onChange={(e) => setExitPopupDelay(e.target.value)}
                    placeholder="3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo de espera antes de ativar a detecção de saída
                  </p>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título do Popup</Label>
                <Input
                  id="title"
                  value={exitPopupTitle}
                  onChange={(e) => setExitPopupTitle(e.target.value)}
                  placeholder="Espera! 🎁"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={exitPopupDescription}
                  onChange={(e) => setExitPopupDescription(e.target.value)}
                  placeholder="Antes de ir, que tal {discount}% de desconto no seu primeiro mês?"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 py-0.5 rounded">{'{discount}'}</code> para o percentual e <code className="bg-muted px-1 py-0.5 rounded">**texto**</code> para negrito
                </p>
              </div>

              {/* Texto do botão */}
              <div className="space-y-2">
                <Label htmlFor="buttonText">Texto do Botão</Label>
                <Input
                  id="buttonText"
                  value={exitPopupButtonText}
                  onChange={(e) => setExitPopupButtonText(e.target.value)}
                  placeholder="Quero Meu Desconto de {discount}%"
                />
              </div>

              <Separator />

              {/* Preview */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Preview</Label>
                <div className="border rounded-lg p-6 bg-background">
                  <div className="max-w-sm mx-auto text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Gift className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">{exitPopupTitle}</h3>
                    <p className="text-muted-foreground" dangerouslySetInnerHTML={{ 
                      __html: formatWithDiscount(exitPopupDescription).replace(
                        /\*\*(.*?)\*\*/g, 
                        '<strong class="text-foreground">$1</strong>'
                      ) 
                    }} />
                    <div className="bg-primary text-primary-foreground py-3 px-6 rounded-lg font-medium">
                      {formatWithDiscount(exitPopupButtonText)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enviaremos o cupom de desconto direto no seu email
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão de salvar */}
              <Button 
                onClick={handleSaveMarketingSettings} 
                disabled={savingMarketing}
                className="w-full"
                size="lg"
              >
                {savingMarketing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações do Popup
                  </>
                )}
              </Button>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">💡 Dicas:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>O popup aparece apenas uma vez por sessão</li>
                  <li>Funciona apenas em desktop (detecção de mouse saindo da janela)</li>
                  <li>O delay evita que o popup apareça imediatamente ao carregar</li>
                  <li>As mudanças são aplicadas instantaneamente após salvar</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
