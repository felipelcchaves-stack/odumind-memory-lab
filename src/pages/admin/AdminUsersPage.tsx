import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import UserManagement from "@/components/admin/UserManagement";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gerenciar Usuários"
        description="Visualize e gerencie os usuários da plataforma"
      />

      <div className="container px-4 pb-8">
        <UserManagement />
      </div>
    </div>
  );
}
