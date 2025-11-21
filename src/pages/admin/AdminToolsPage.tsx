import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import HtmlCleanupTool from "@/components/admin/HtmlCleanupTool";

export default function AdminToolsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Ferramentas Administrativas"
        description="Utilitários para manutenção e correção do sistema"
      />

      <div className="container px-4 pb-8">
        <HtmlCleanupTool />
      </div>
    </div>
  );
}
