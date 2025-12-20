import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Permission {
  permission_type: string;
  can_access: boolean;
}

interface CollaboratorPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string; category: 'basic' | 'operational' | 'admin' }> = {
  // Permissões básicas de conteúdo
  odu: {
    label: "Gerenciar Odu",
    description: "Criar, editar e excluir Odu",
    category: 'basic',
  },
  rituais: {
    label: "Gerenciar Rituais",
    description: "Criar, editar e excluir rituais, rezas e invocações",
    category: 'basic',
  },
  changelog: {
    label: "Gerenciar Novidades",
    description: "Criar e editar changelog",
    category: 'basic',
  },
  tools: {
    label: "Ferramentas",
    description: "Acessar ferramentas administrativas",
    category: 'basic',
  },
  caminhos: {
    label: "Gerenciar Caminhos",
    description: "Criar e editar trilhas de aprendizado",
    category: 'basic',
  },
  // Permissões operacionais (para desonerar o admin)
  users: {
    label: "Gerenciar Usuários",
    description: "Visualizar usuários, editar perfis e reenviar senhas (não pode promover a admin)",
    category: 'operational',
  },
  analytics: {
    label: "Analytics",
    description: "Visualizar métricas gerais da plataforma",
    category: 'operational',
  },
  analytics_avancadas: {
    label: "Analytics Avançadas",
    description: "Visualizar insights detalhados e análises de marketing",
    category: 'operational',
  },
  anuncios: {
    label: "Gerenciar Anúncios",
    description: "Criar e gerenciar anúncios e comunicados",
    category: 'operational',
  },
  avaliacoes: {
    label: "Gerenciar Avaliações",
    description: "Moderar avaliações e depoimentos de usuários",
    category: 'operational',
  },
  // Permissões exclusivas de admin
  settings: {
    label: "Configurações",
    description: "Gerenciar configurações do sistema",
    category: 'admin',
  },
  restore: {
    label: "Restaurar Assinaturas",
    description: "Restaurar planos de usuários",
    category: 'admin',
  },
};

export function CollaboratorPermissionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: CollaboratorPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadPermissions();
    }
  }, [open, userId]);

  async function loadPermissions() {
    try {
      setLoading(true);
      const { data } = await supabase
        .from("collaborator_permissions")
        .select("permission_type, can_access")
        .eq("user_id", userId);

      const permissionsMap: Record<string, boolean> = {};
      
      // Initialize all permissions as false
      Object.keys(PERMISSION_LABELS).forEach((key) => {
        permissionsMap[key] = false;
      });

      // Update with actual permissions
      data?.forEach((perm: Permission) => {
        permissionsMap[perm.permission_type] = perm.can_access;
      });

      setPermissions(permissionsMap);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Erro ao carregar permissões");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);

      // Delete existing permissions
      await supabase
        .from("collaborator_permissions")
        .delete()
        .eq("user_id", userId);

      // Insert new permissions (only the ones that are true)
      const permissionsToInsert = Object.entries(permissions)
        .filter(([_, canAccess]) => canAccess)
        .map(([permissionType]) => ({
          user_id: userId,
          permission_type: permissionType,
          can_access: true,
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from("collaborator_permissions")
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast.success("Permissões atualizadas com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  }

  const togglePermission = (permissionType: string) => {
    setPermissions((prev) => ({
      ...prev,
      [permissionType]: !prev[permissionType],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões de {userName}
          </DialogTitle>
          <DialogDescription>
            Defina quais seções administrativas este colaborador pode acessar
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-6">
                {/* Basic Permissions - Content */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                    📝 Permissões de Conteúdo
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(PERMISSION_LABELS)
                      .filter(([_, v]) => v.category === 'basic')
                      .map(([key, value]) => (
                      <div key={key} className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                        <Checkbox
                          id={key}
                          checked={permissions[key] || false}
                          onCheckedChange={() => togglePermission(key)}
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={key}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {value.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operational Permissions - To offload admin */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                    📊 Permissões Operacionais
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Permita que colaboradores ajudem nas operações do dia-a-dia
                  </p>
                  <div className="space-y-3">
                    {Object.entries(PERMISSION_LABELS)
                      .filter(([_, v]) => v.category === 'operational')
                      .map(([key, value]) => (
                      <div key={key} className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                        <Checkbox
                          id={key}
                          checked={permissions[key] || false}
                          onCheckedChange={() => togglePermission(key)}
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={key}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {value.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin-only Permissions */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                    🔒 Permissões Administrativas (Apenas Admins)
                  </h3>
                  <div className="space-y-3 opacity-50">
                    {Object.entries(PERMISSION_LABELS)
                      .filter(([_, v]) => v.category === 'admin')
                      .map(([key, value]) => (
                      <div key={key} className="flex items-start space-x-3 rounded-lg border p-4">
                        <Checkbox
                          id={key}
                          checked={false}
                          disabled
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={key}
                            className="text-sm font-medium leading-none"
                          >
                            {value.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Estas permissões são exclusivas para administradores
                  </p>
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Permissões
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
