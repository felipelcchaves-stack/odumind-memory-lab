import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import SessionAnalytics from "@/components/admin/SessionAnalytics";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics de Sessões"
        description="Monitoramento de sessões de estudo e métricas de auto-finalização"
      />

      <div className="container px-4 pb-8">
        <SessionAnalytics />
      </div>
    </div>
  );
}
