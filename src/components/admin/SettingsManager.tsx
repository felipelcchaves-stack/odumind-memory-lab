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
import { Loader2, Save, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Code, CreditCard, Megaphone, Gift, CalendarClock, Play, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { CustomScriptsManager } from './CustomScriptsManager';
import { supabase } from '@/integrations/supabase/client';

export function SettingsManager() {
  const { settings, loading, updateSetting, getSettingsByCategory } = useAppSettings();
  const { visibility, loading: visibilityLoading, saving: visibilitySaving, updateVisibility } = usePlanVisibilityAdmin();
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const trackingSettings = getSettingsByCategory('tracking');
  const marketingSettings = getSettingsByCategory('marketing');
  const landingSettings = getSettingsByCategory('landing');

  // Estados para o exit popup
  const [exitPopupEnabled, setExitPopupEnabled] = useState(true);
  const [exitPopupDiscount, setExitPopupDiscount] = useState('20');
  const [exitPopupTitle, setExitPopupTitle] = useState('Espera! 🎁');
  const [exitPopupDescription, setExitPopupDescription] = useState('Antes de ir, que tal **{discount}% de desconto** no seu primeiro mês?');
  const [exitPopupButtonText, setExitPopupButtonText] = useState('Quero Meu Desconto de {discount}%');
  const [exitPopupDelay, setExitPopupDelay] = useState('3');
  const [savingMarketing, setSavingMarketing] = useState(false);

  // Estados para automação de ofertas
  const [autoRenewalEnabled, setAutoRenewalEnabled] = useState(false);
  const [autoRenewalDaysBefore, setAutoRenewalDaysBefore] = useState('7');
  const [autoRenewalDiscount, setAutoRenewalDiscount] = useState('15');
  const [savingAutoRenewal, setSavingAutoRenewal] = useState(false);
  const [testingAutoRenewal, setTestingAutoRenewal] = useState(false);

  // Estados para seção de técnicas na landing
  const [showTechniqueScreenshots, setShowTechniqueScreenshots] = useState(false);

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
          case 'auto_renewal_enabled':
            setAutoRenewalEnabled(setting.value === 'true');
            break;
          case 'auto_renewal_days_before':
            setAutoRenewalDaysBefore(setting.value || '7');
            break;
          case 'auto_renewal_discount_percent':
            setAutoRenewalDiscount(setting.value || '15');
            break;
        }
      });
    }
  }, [marketingSettings]);

  // Carregar valores de landing
  useEffect(() => {
    if (landingSettings.length > 0) {
      landingSettings.forEach(setting => {
        if (setting.key === 'show_technique_screenshots') {
          setShowTechniqueScreenshots(setting.value === 'true');
        }
      });
    }
  }, [landingSettings]);

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

  const handleSaveAutoRenewalSettings = async () => {
    setSavingAutoRenewal(true);
    try {
      await Promise.all([
        updateSetting('auto_renewal_enabled', String(autoRenewalEnabled)),
        updateSetting('auto_renewal_days_before', autoRenewalDaysBefore),
        updateSetting('auto_renewal_discount_percent', autoRenewalDiscount),
      ]);
      toast.success('Configurações de automação salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingAutoRenewal(false);
    }
  };

  const handleTestAutoRenewal = async () => {
    setTestingAutoRenewal(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-renewal-offers');
      
      if (error) throw error;
      
      toast.success(`Teste executado! Enviadas: ${data?.sent || 0} ofertas`, {
        description: data?.message
      });
    } catch (error: any) {
      toast.error('Erro ao executar teste', {
        description: error.message
      });
    } finally {
      setTestingAutoRenewal(false);
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
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="landing" className="gap-2">
            <Layout className="w-4 h-4" />
            Landing
          </TabsTrigger>
          <TabsTrigger value="pixels">Pixels</TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <Code className="w-4 h-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <CalendarClock className="w-4 h-4" />
            Automação
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

        <TabsContent value="landing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" />
                Configurações da Landing Page
              </CardTitle>
              <CardDescription>
                Controle quais seções aparecem na landing page. Útil para testes A/B e otimizações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Switch para seção de técnicas */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Seção de Técnicas de Memorização</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibe um carrossel com screenshots dos exercícios (Flashcards, Quiz, Cloze, etc.)
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    A seção aparece entre Features e Depoimentos
                  </p>
                </div>
                <Switch
                  checked={showTechniqueScreenshots}
                  onCheckedChange={async (checked) => {
                    setShowTechniqueScreenshots(checked);
                    try {
                      await updateSetting('show_technique_screenshots', String(checked));
                      toast.success(checked ? 'Seção de técnicas habilitada' : 'Seção de técnicas desabilitada');
                    } catch (error) {
                      toast.error('Erro ao salvar configuração');
                      setShowTechniqueScreenshots(!checked);
                    }
                  }}
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">💡 Sobre a seção de Técnicas:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Mostra previews visuais de 5 tipos de exercícios</li>
                  <li>Usa textos reais do Odu Ejiogbe para demonstração</li>
                  <li>Carrossel responsivo com navegação por swipe em mobile</li>
                  <li>Ideal para aumentar conversão mostrando o produto em ação</li>
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
                  onCheckedChange={async (checked) => {
                    setExitPopupEnabled(checked);
                    try {
                      await updateSetting('exit_popup_enabled', String(checked));
                      toast.success(checked ? 'Popup habilitado' : 'Popup desabilitado');
                    } catch (error) {
                      toast.error('Erro ao salvar configuração');
                      setExitPopupEnabled(!checked); // Reverter em caso de erro
                    }
                  }}
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

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                Automação de Ofertas de Renovação
              </CardTitle>
              <CardDescription>
                Configure o envio automático de ofertas de desconto para usuários com assinatura próxima do vencimento.
                O sistema verifica diariamente e envia ofertas automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Switch para habilitar/desabilitar */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-medium">Automação Habilitada</Label>
                    <Badge variant={autoRenewalEnabled ? "default" : "secondary"}>
                      {autoRenewalEnabled ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Quando ativada, ofertas são enviadas automaticamente para usuários com vencimento próximo
                  </p>
                </div>
                <Switch
                  checked={autoRenewalEnabled}
                  onCheckedChange={setAutoRenewalEnabled}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Dias antes do vencimento */}
                <div className="space-y-2">
                  <Label htmlFor="daysBefore">Dias antes do vencimento</Label>
                  <Input
                    id="daysBefore"
                    type="number"
                    min="1"
                    max="30"
                    value={autoRenewalDaysBefore}
                    onChange={(e) => setAutoRenewalDaysBefore(e.target.value)}
                    placeholder="7"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantos dias antes do vencimento a oferta será enviada
                  </p>
                </div>

                {/* Percentual de desconto */}
                <div className="space-y-2">
                  <Label htmlFor="autoDiscount">Percentual de Desconto (%)</Label>
                  <Input
                    id="autoDiscount"
                    type="number"
                    min="5"
                    max="50"
                    value={autoRenewalDiscount}
                    onChange={(e) => setAutoRenewalDiscount(e.target.value)}
                    placeholder="15"
                  />
                  <p className="text-xs text-muted-foreground">
                    Desconto oferecido para renovação antecipada
                  </p>
                </div>
              </div>

              <Separator />

              {/* Preview da lógica */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">📋 Exemplo de funcionamento:</h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Com as configurações atuais, usuários receberão um email com <strong>{autoRenewalDiscount}% de desconto</strong> quando 
                    faltarem <strong>{autoRenewalDaysBefore} dias</strong> para o vencimento da assinatura.
                  </p>
                  <p>
                    Se um usuário tem vencimento em <strong>27/12/2025</strong>, ele receberá a oferta no dia{' '}
                    <strong>{new Date(new Date().setDate(new Date().getDate() + parseInt(autoRenewalDaysBefore || '7'))).toLocaleDateString('pt-BR')}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                {/* Botão de salvar */}
                <Button 
                  onClick={handleSaveAutoRenewalSettings} 
                  disabled={savingAutoRenewal}
                  className="flex-1"
                >
                  {savingAutoRenewal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>

                {/* Botão de testar */}
                <Button 
                  variant="outline"
                  onClick={handleTestAutoRenewal} 
                  disabled={testingAutoRenewal || !autoRenewalEnabled}
                >
                  {testingAutoRenewal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Executar Agora
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">💡 Informações:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>O sistema verifica automaticamente todos os dias às 9h</li>
                  <li>Cada usuário recebe apenas uma oferta por ciclo de renovação</li>
                  <li>Os cupons gerados são únicos e de uso único</li>
                  <li>Os cupons expiram em 14 dias após o envio</li>
                  <li>Use "Executar Agora" para testar o envio manualmente</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
