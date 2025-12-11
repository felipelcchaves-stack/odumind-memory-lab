import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import SessionAnalytics from "@/components/admin/SessionAnalytics";
import UtmAnalytics from "@/components/admin/UtmAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        description="Monitoramento de sessões, campanhas e métricas de marketing"
      />

      <div className="container px-4 pb-8">
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sessions">Sessões de Estudo</TabsTrigger>
            <TabsTrigger value="utm">Campanhas UTM</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <SessionAnalytics />
          </TabsContent>

          <TabsContent value="utm">
            <UtmAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
