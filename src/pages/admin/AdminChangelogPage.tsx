import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import ChangelogManager from "@/components/admin/ChangelogManager";

export default function AdminChangelogPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gerenciar Novidades"
        description="Crie e edite as novidades do changelog"
      />

      <div className="container px-4 pb-8">
        <ChangelogManager />
      </div>
    </div>
  );
}
