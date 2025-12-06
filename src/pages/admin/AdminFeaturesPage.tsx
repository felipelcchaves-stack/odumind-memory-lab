import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { BookOpen, Flame, Heart, Sparkles, Loader2, Save, Eye, EyeOff, Info, Gift, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ContentType {
  id: string;
  slug: string;
  nome: string;
  icon: string;
  ativo: boolean;
  descricao: string;
  count?: number;
}

interface SystemFeature {
  key: string;
  nome: string;
  descricao: string;
  icon: any;
  enabled: boolean;
}

const iconMap: Record<string, any> = {
  BookOpen,
  Flame,
  Heart,
  Sparkles,
};

export default function AdminFeaturesPage() {
  const { user } = useAuth();
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [systemFeatures, setSystemFeatures] = useState<SystemFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [featureChanges, setFeatureChanges] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadContentTypes();
    loadSystemFeatures();
  }, []);

  const loadSystemFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('category', 'features');

      if (error) throw error;

      const features: SystemFeature[] = [
        {
          key: 'referral_system_enabled',
          nome: 'Sistema de Indicação',
          descricao: 'Permite que alunos indiquem amigos e ganhem recompensas (dias Premium grátis)',
          icon: Gift,
          enabled: data?.find(s => s.key === 'referral_system_enabled')?.value === 'true',
        },
      ];

      setSystemFeatures(features);
    } catch (error) {
      console.error('Error loading system features:', error);
    }
  };

  const loadContentTypes = async () => {
    try {
      const { data: types, error } = await supabase
        .from('content_types')
        .select('*')
        .order('ordem');

      if (error) throw error;

      // Fetch counts
      const typesWithCounts = await Promise.all(
        (types || []).map(async (ct) => {
          let count = 0;
          
          if (ct.slug === 'odu') {
            const { count: oduCount } = await supabase
              .from('odu')
              .select('*', { count: 'exact', head: true });
            count = oduCount || 0;
          } else {
            const { count: ritualCount } = await supabase
              .from('ritual_content')
              .select('*', { count: 'exact', head: true })
              .eq('content_type_id', ct.id);
            count = ritualCount || 0;
          }

          return { ...ct, count };
        })
      );

      setContentTypes(typesWithCounts);
    } catch (error) {
      console.error('Error loading content types:', error);
      toast.error('Erro ao carregar tipos de conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string, newValue: boolean) => {
    setChanges(prev => ({ ...prev, [id]: newValue }));
    setContentTypes(prev => 
      prev.map(ct => ct.id === id ? { ...ct, ativo: newValue } : ct)
    );
  };

  const handleFeatureToggle = (key: string, newValue: boolean) => {
    setFeatureChanges(prev => ({ ...prev, [key]: newValue }));
    setSystemFeatures(prev => 
      prev.map(f => f.key === key ? { ...f, enabled: newValue } : f)
    );
  };

  const saveChanges = async () => {
    const hasContentChanges = Object.keys(changes).length > 0;
    const hasFeatureChanges = Object.keys(featureChanges).length > 0;

    if (!hasContentChanges && !hasFeatureChanges) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }

    setSaving(true);
    try {
      // Salvar mudanças em content_types
      for (const [id, ativo] of Object.entries(changes)) {
        const { error } = await supabase
          .from('content_types')
          .update({ ativo, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
      }

      // Salvar mudanças em app_settings (features)
      for (const [key, enabled] of Object.entries(featureChanges)) {
        const { error } = await supabase
          .from('app_settings')
          .update({ 
            value: enabled ? 'true' : 'false', 
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          })
          .eq('key', key);

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
      setChanges({});
      setFeatureChanges({});
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(changes).length > 0 || Object.keys(featureChanges).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gestão de Funcionalidades"
        description="Habilite ou desabilite módulos do sistema. Funcionalidades desabilitadas não aparecerão para usuários na plataforma nem na landing page."
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          Ao desabilitar uma funcionalidade, ela será completamente ocultada:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Não aparecerá na Landing Page</li>
            <li>Não aparecerá no Dashboard dos usuários</li>
            <li>Não aparecerá na Biblioteca Yorubá</li>
            <li>Os dados cadastrados permanecem salvos</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Tipos de Conteúdo */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Tipos de Conteúdo
        </h2>
        <div className="grid gap-4">
          {contentTypes.map((ct) => {
            const IconComponent = iconMap[ct.icon] || BookOpen;
            const isOdu = ct.slug === 'odu';
            
            return (
              <Card key={ct.id} className={!ct.ativo ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${ct.ativo ? 'bg-primary/10' : 'bg-muted'}`}>
                        <IconComponent className={`h-6 w-6 ${ct.ativo ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{ct.nome}</h3>
                          {isOdu && (
                            <Badge variant="secondary">Sempre Ativo</Badge>
                          )}
                          {ct.ativo ? (
                            <Badge variant="default" className="bg-green-500">
                              <Eye className="h-3 w-3 mr-1" />
                              Visível
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Oculto
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{ct.descricao}</p>
                        <p className="text-sm mt-1">
                          <span className="font-medium">{ct.count}</span> {ct.slug === 'odu' ? 'Odu' : 'itens'} cadastrados
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {!isOdu && (
                        <Switch
                          checked={ct.ativo}
                          onCheckedChange={(checked) => handleToggle(ct.id, checked)}
                          disabled={isOdu}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Funcionalidades do Sistema */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Funcionalidades do Sistema
        </h2>
        <div className="grid gap-4">
          {systemFeatures.map((feature) => {
            const IconComponent = feature.icon;
            
            return (
              <Card key={feature.key} className={!feature.enabled ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${feature.enabled ? 'bg-accent/10' : 'bg-muted'}`}>
                        <IconComponent className={`h-6 w-6 ${feature.enabled ? 'text-accent' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{feature.nome}</h3>
                          {feature.enabled ? (
                            <Badge variant="default" className="bg-green-500">
                              <Eye className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Desativado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{feature.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={(checked) => handleFeatureToggle(feature.key, checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={saveChanges} disabled={saving} size="lg" className="shadow-lg">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      )}
    </div>
  );
}
