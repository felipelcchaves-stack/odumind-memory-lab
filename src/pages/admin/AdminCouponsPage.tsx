import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CouponsManager } from "@/components/admin/CouponsManager";

export default function AdminCouponsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gerenciamento de Cupons"
        description="Visualize, crie e gerencie cupons de desconto"
      />

      <div className="container px-4 pb-8">
        <CouponsManager />
      </div>
    </div>
  );
}
