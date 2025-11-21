import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import SubscriptionRestore from "@/components/admin/SubscriptionRestore";

export default function AdminRestorePage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Restaurar Assinaturas"
        description="Restaure assinaturas e planos de usuários"
      />

      <div className="container px-4 pb-8">
        <SubscriptionRestore />
      </div>
    </div>
  );
}
