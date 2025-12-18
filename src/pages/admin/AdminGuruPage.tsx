import { useState, useEffect } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ExternalLink, CheckCircle, AlertCircle, CreditCard, Link2, Users, Flame, Copy } from "lucide-react";
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
    guru_checkout_awo_monthly: "",
    guru_checkout_egbe_monthly: "",
  });

  // Promo settings
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoName, setPromoName] = useState("Lançamento Especial");
  const [promoDurationDays, setPromoDurationDays] = useState("90");
  const [promoPlanMapping, setPromoPlanMapping] = useState("Awo");
  const [promoCheckoutUrl, setPromoCheckoutUrl] = useState("");
  const [promoGuruProductId, setPromoGuruProductId] = useState("");

  const durationPresets = [
    { label: "Mensal (30 dias)", value: "30" },
    { label: "Trimestral (90 dias)", value: "90" },
    { label: "Semestral (180 dias)", value: "180" },
    { label: "Anual (365 dias)", value: "365" },
    { label: "Bianual (730 dias)", value: "730" },
    { label: "Personalizado", value: "custom" },
  ];

  const checkoutSettings: GuruSetting[] = [
    {
      key: "guru_checkout_awo_monthly",
      value: checkoutLinks.guru_checkout_awo_monthly,
      label: "Awo Mensal",
      description: "R$ 97,00/mês - O plano ideal para dominar os 256 Odu",
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
      
      // Load GURU settings
      const { data: guruData, error: guruError } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("category", "guru");

      if (guruError) throw guruError;

      const settings: Record<string, string> = {};
      guruData?.forEach((s) => {
        if (s.key === "guru_enabled") {
          setGuruEnabled(s.value === "true");
        } else if (s.key === "guru_member_area_url") {
          setMemberAreaUrl(s.value || "");
        } else if (s.key === "guru_checkout_awo_monthly" || s.key === "guru_checkout_egbe_monthly") {
          settings[s.key] = s.value || "";
        }
      });
      setCheckoutLinks(settings);

      // Load promo settings
      const { data: promoData, error: promoError } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("category", "promo");

      if (promoError) throw promoError;

      promoData?.forEach((s) => {
        switch (s.key) {
          case "promo_enabled":
            setPromoEnabled(s.value === "true");
            break;
          case "promo_name":
            setPromoName(s.value || "Lançamento Especial");
            break;
          case "promo_duration_days":
            setPromoDurationDays(s.value || "90");
            break;
          case "promo_plan_mapping":
            setPromoPlanMapping(s.value || "Awo");
            break;
          case "promo_checkout_url":
            setPromoCheckoutUrl(s.value || "");
            break;
          case "promo_guru_product_id":
            setPromoGuruProductId(s.value || "");
            break;
        }
      });
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutLinkChange = (key: string, value: string) => {
    setCheckoutLinks((prev) => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para salvar configurações");
        return;
      }

      console.log("[GURU] Salvando configurações como usuário:", user.id);

      // All updates including promo settings
      const updates = [
        { key: "guru_enabled", value: guruEnabled ? "true" : "false" },
        { key: "guru_member_area_url", value: memberAreaUrl },
        ...Object.entries(checkoutLinks).map(([key, value]) => ({ key, value })),
        // Promo settings
        { key: "promo_enabled", value: promoEnabled ? "true" : "false" },
        { key: "promo_name", value: promoName },
        { key: "promo_duration_days", value: promoDurationDays },
        { key: "promo_plan_mapping", value: promoPlanMapping },
        { key: "promo_checkout_url", value: promoCheckoutUrl },
        { key: "promo_guru_product_id", value: promoGuruProductId },
      ];

      let successCount = 0;
      let failCount = 0;

      for (const update of updates) {
        console.log(`[GURU] Atualizando ${update.key} = "${update.value}"`);
        
        const { data, error } = await supabase
          .from("app_settings")
          .update({ 
            value: update.value, 
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq("key", update.key)
          .select();

        if (error) {
          console.error(`[GURU] Erro ao atualizar ${update.key}:`, error);
          failCount++;
          continue;
        }
        
        if (!data || data.length === 0) {
          console.warn(`[GURU] Nenhuma linha afetada para ${update.key} - a chave pode não existir`);
          failCount++;
        } else {
          console.log(`[GURU] ${update.key} atualizado com sucesso:`, data);
          successCount++;
        }
      }

      if (failCount === 0) {
        toast.success("Configurações salvas com sucesso!");
      } else if (successCount > 0) {
        toast.warning(`${successCount} configurações salvas, ${failCount} falharam`);
      } else {
        toast.error("Nenhuma configuração foi salva. Verifique se as chaves existem no banco.");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Status da Integração</CardTitle>
                <CardDescription>Gerencie o gateway de pagamento</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={configuredCount === totalLinks ? "default" : "secondary"}>
                {configuredCount}/{totalLinks} links configurados
              </Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="guru-enabled" className="text-sm whitespace-nowrap">
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

      {/* Promotional Plan Card */}
      <Card className={promoEnabled ? "border-orange-500/50 bg-orange-500/5" : ""}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${promoEnabled ? "bg-orange-500/20" : "bg-muted"}`}>
                <Flame className={`h-5 w-5 ${promoEnabled ? "text-orange-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Plano Promocional</CardTitle>
                <CardDescription>
                  Configure promoções especiais para lives e campanhas
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="promo-enabled" className="text-sm whitespace-nowrap">
                Promoção Ativa
              </Label>
              <Switch
                id="promo-enabled"
                checked={promoEnabled}
                onCheckedChange={setPromoEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {promoEnabled && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Promoção ativa! Compras via link promocional serão reconhecidas automaticamente pelo webhook.</span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* ID do Produto GURU */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="promo-product-id">ID/Nome do Produto na GURU</Label>
              <p className="text-xs text-muted-foreground">
                Identificador único da oferta promocional na GURU. O sistema usará isso para reconhecer compras desta promoção específica.
              </p>
              <Input
                id="promo-product-id"
                value={promoGuruProductId}
                onChange={(e) => setPromoGuruProductId(e.target.value)}
                placeholder="Ex: lancamento-2024, black-friday, promo-especial"
              />
              {!promoGuruProductId && promoEnabled && (
                <p className="text-xs text-amber-600">
                  ⚠️ Sem ID configurado, qualquer produto não reconhecido será tratado como promoção
                </p>
              )}
            </div>

            {/* Nome da Promoção */}
            <div className="space-y-2">
              <Label htmlFor="promo-name">Nome da Promoção</Label>
              <p className="text-xs text-muted-foreground">Aparecerá no email de boas-vindas</p>
              <Input
                id="promo-name"
                value={promoName}
                onChange={(e) => setPromoName(e.target.value)}
                placeholder="Ex: Lançamento 2024, Black Friday"
              />
            </div>

            {/* Duração com Presets */}
            <div className="space-y-2">
              <Label htmlFor="promo-duration">Duração do Acesso</Label>
              <p className="text-xs text-muted-foreground">Quantos dias de acesso o aluno terá</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select 
                  value={durationPresets.some(p => p.value === promoDurationDays) ? promoDurationDays : "custom"} 
                  onValueChange={(v) => {
                    if (v !== "custom") {
                      setPromoDurationDays(v);
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationPresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="promo-duration"
                  type="number"
                  min="1"
                  value={promoDurationDays}
                  onChange={(e) => setPromoDurationDays(e.target.value)}
                  placeholder="Dias"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Plano Interno */}
            <div className="space-y-2">
              <Label htmlFor="promo-plan">Plano Interno</Label>
              <p className="text-xs text-muted-foreground">Define as permissões do aluno</p>
              <Select value={promoPlanMapping} onValueChange={setPromoPlanMapping}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Awo">Awo (Premium Individual)</SelectItem>
                  <SelectItem value="Egbe">Egbe (Família)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL do Checkout */}
            <div className="space-y-2">
              <Label htmlFor="promo-checkout">URL de Checkout GURU</Label>
              <p className="text-xs text-muted-foreground">Link para compartilhar na live</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="promo-checkout"
                  value={promoCheckoutUrl}
                  onChange={(e) => setPromoCheckoutUrl(e.target.value)}
                  placeholder="https://pay.guru.com.br/..."
                  className="flex-1"
                />
                {promoCheckoutUrl && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(promoCheckoutUrl)}
                      title="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(promoCheckoutUrl, "_blank")}
                      title="Abrir link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Link para Copiar */}
          {promoEnabled && promoCheckoutUrl && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-2">Link para compartilhar na live:</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-background rounded text-sm break-all min-w-0">
                  {promoCheckoutUrl}
                </code>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => copyToClipboard(promoCheckoutUrl)}
                  className="w-full sm:w-auto shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
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
              <CardTitle className="text-lg">Links de Checkout Padrão</CardTitle>
              <CardDescription>
                Configure os links de checkout para os planos regulares. Obtenha esses links no painel da GURU.
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
                  {checkoutLinks[setting.key] ? (
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
                    className="flex-1 min-w-0"
                  />
                  {checkoutLinks[setting.key] && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(checkoutLinks[setting.key], "_blank")}
                      title="Testar link"
                      className="shrink-0"
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
                className="flex-1 min-w-0"
              />
              {memberAreaUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(memberAreaUrl, "_blank")}
                  title="Abrir área do membro"
                  className="shrink-0"
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
            <li>Para promoções de live, configure o "Plano Promocional" com URL específica e ative-o</li>
            <li className="break-words">Configure o webhook na GURU apontando para:
              <code className="block mt-1 px-2 py-1 bg-background rounded text-xs break-all overflow-wrap-anywhere">
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
