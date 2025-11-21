import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";
import RitualEditor from "@/components/admin/RitualEditor";
import RitualList from "@/components/admin/RitualList";
import RitualBulkUpload from "@/components/admin/RitualBulkUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminRituaisPage() {
  const [selectedRitual, setSelectedRitual] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("list");

  const handleRitualSaved = () => {
    setSelectedRitual(null);
    setActiveTab("list");
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditRitual = (ritualId: string) => {
    setSelectedRitual(ritualId);
    setActiveTab("editor");
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gerenciar Rituais"
        description="Visualize, edite ou exclua rituais, rezas e invocações"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setActiveTab("upload")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload em Massa
            </Button>
            <Button
              onClick={() => {
                setSelectedRitual("new");
                setActiveTab("editor");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Conteúdo
            </Button>
          </>
        }
      />

      <div className="container px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <RitualList onEdit={handleEditRitual} refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="editor" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {selectedRitual ? (
                  <RitualEditor
                    ritualId={selectedRitual === "new" ? undefined : selectedRitual}
                    onSaved={handleRitualSaved}
                    onCancel={() => {
                      setSelectedRitual(null);
                      setActiveTab("list");
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Selecione um conteúdo da lista para editar
                    </p>
                    <Button
                      onClick={() => {
                        setSelectedRitual("new");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Novo Conteúdo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <RitualBulkUpload
                  onSuccess={() => {
                    setRefreshTrigger((prev) => prev + 1);
                    setActiveTab("list");
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
