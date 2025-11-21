import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsManager } from "@/components/admin/SettingsManager";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Configurações do Sistema"
        description="Gerencie as configurações globais da aplicação"
      />

      <div className="container px-4 pb-8">
        <SettingsManager />
      </div>
    </div>
  );
}
