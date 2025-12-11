import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Loader2, Save, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Code } from 'lucide-react';
import { toast } from 'sonner';
import { CustomScriptsManager } from './CustomScriptsManager';

export function SettingsManager() {
  const { settings, loading, updateSetting, getSettingsByCategory } = useAppSettings();
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const trackingSettings = getSettingsByCategory('tracking');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pixels" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pixels">IDs dos Pixels</TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2">
            <Code className="w-4 h-4" />
            Scripts Customizados
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
