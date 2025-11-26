import { useState, useEffect } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, ExternalLink, CheckCircle, AlertCircle, CreditCard, Link2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GuruSetting {
  key: string;
  value: string;
  label: string;
  description: string;
  placeholder: string;
}

const AdminGuruPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guruEnabled, setGuruEnabled] = useState(true);
  const [memberAreaUrl, setMemberAreaUrl] = useState("");
  const [checkoutLinks, setCheckoutLinks] = useState<Record<string, string>>({
    guru_checkout_akapo_monthly: "",
    guru_checkout_akapo_annual: "",
    guru_checkout_awo_monthly: "",
    guru_checkout_awo_annual: "",
    guru_checkout_egbe_monthly: "",
  });

  const checkoutSettings: GuruSetting[] = [
    {
      key: "guru_checkout_akapo_monthly",
      value: checkoutLinks.guru_checkout_akapo_monthly,
      label: "Akapo Mensal",
      description: "R$ 49,90/mês - Plano inicial premium",
      placeholder: "https://pay.guru.com.br/...",
    },
    {
      key: "guru_checkout_akapo_annual",
      value: checkoutLinks.guru_checkout_akapo_annual,
      label: "Akapo Anual",
      description: "R$ 499,90/ano - Economize R$ 99",
      placeholder: "https://pay.guru.com.br/...",
    },
    {
      key: "guru_checkout_awo_monthly",
      value: checkoutLinks.guru_checkout_awo_monthly,
      label: "Awo Mensal",
      description: "R$ 99,90/mês - Para mestres e professores",
      placeholder: "https://pay.guru.com.br/...",
    },
    {
      key: "guru_checkout_awo_annual",
      value: checkoutLinks.guru_checkout_awo_annual,
      label: "Awo Anual",
      description: "R$ 999,90/ano - Economize R$ 199",
      placeholder: "https://pay.guru.com.br/...",
    },
    {
      key: "guru_checkout_egbe_monthly",
      value: checkoutLinks.guru_checkout_egbe_monthly,
      label: "Egbe (Família)",
      description: "R$ 129,90/mês - Até 5 contas",
      placeholder: "https://pay.guru.com.br/...",
    },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("category", "guru");

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach((s) => {
        if (s.key === "guru_enabled") {
          setGuruEnabled(s.value === "true");
        } else if (s.key === "guru_member_area_url") {
          setMemberAreaUrl(s.value || "");
        } else {
          settings[s.key] = s.value || "";
        }
      });
      setCheckoutLinks(settings);
    } catch (error) {
      console.error("Error loading GURU settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutLinkChange = (key: string, value: string) => {
    setCheckoutLinks((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Update all settings
      const updates = [
        { key: "guru_enabled", value: guruEnabled ? "true" : "false" },
        { key: "guru_member_area_url", value: memberAreaUrl },
        ...Object.entries(checkoutLinks).map(([key, value]) => ({ key, value })),
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq("key", update.key);

        if (error) throw error;
      }

      toast.success("Configurações da GURU salvas com sucesso!");
    } catch (error) {
      console.error("Error saving GURU settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const configuredCount = Object.values(checkoutLinks).filter((v) => v.trim() !== "").length;
  const totalLinks = Object.keys(checkoutLinks).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminBreadcrumbs />
        <AdminPageHeader
          title="Configurações GURU"
          description="Carregando..."
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs />
      <AdminPageHeader
        title="Configurações GURU"
        description="Configure os links de checkout da plataforma GURU para pagamentos"
      />

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Status da Integração</CardTitle>
                <CardDescription>Gerencie o gateway de pagamento</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={configuredCount === totalLinks ? "default" : "secondary"}>
                {configuredCount}/{totalLinks} links configurados
              </Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="guru-enabled" className="text-sm">
                  GURU Ativo
                </Label>
                <Switch
                  id="guru-enabled"
                  checked={guruEnabled}
                  onCheckedChange={setGuruEnabled}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {guruEnabled ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Pagamentos via GURU estão ativos. Os links de checkout redirecionarão para a GURU.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>GURU desativado. Os pagamentos usarão o Stripe como fallback.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkout Links */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Link2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg">Links de Checkout</CardTitle>
              <CardDescription>
                Configure os links de checkout para cada plano. Obtenha esses links no painel da GURU após criar os produtos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {checkoutSettings.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={setting.key} className="font-medium">
                    {setting.label}
                  </Label>
                  {setting.value ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Pendente
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{setting.description}</p>
                <div className="flex gap-2">
                  <Input
                    id={setting.key}
                    value={checkoutLinks[setting.key] || ""}
                    onChange={(e) => handleCheckoutLinkChange(setting.key, e.target.value)}
                    placeholder={setting.placeholder}
                  />
                  {setting.value && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(setting.value, "_blank")}
                      title="Testar link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Member Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/50">
              <Users className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Área do Membro</CardTitle>
              <CardDescription>
                Link para a área do membro na GURU onde os usuários podem gerenciar suas assinaturas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="member-area">URL da Área do Membro</Label>
            <div className="flex gap-2">
              <Input
                id="member-area"
                value={memberAreaUrl}
                onChange={(e) => setMemberAreaUrl(e.target.value)}
                placeholder="https://membro.guru.com.br/..."
              />
              {memberAreaUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(memberAreaUrl, "_blank")}
                  title="Abrir área do membro"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} size="lg">
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Como Configurar</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ol className="list-decimal list-inside space-y-2">
            <li>Acesse o painel da GURU e crie os produtos/ofertas correspondentes a cada plano</li>
            <li>Copie o link de checkout de cada produto criado</li>
            <li>Cole os links nos campos acima correspondentes</li>
            <li>Configure o webhook na GURU apontando para:
              <code className="ml-2 px-2 py-1 bg-background rounded text-xs">
                https://wmwuirqdluzjdqtmfzsm.supabase.co/functions/v1/guru-webhook
              </code>
            </li>
            <li>Certifique-se de que o api_token está configurado no payload do webhook</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGuruPage;
