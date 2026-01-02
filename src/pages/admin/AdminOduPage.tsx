import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload, Download } from "lucide-react";
import OduEditor from "@/components/admin/OduEditor";
import OduList from "@/components/admin/OduList";
import BulkUpload from "@/components/admin/BulkUpload";
import OduExport from "@/components/admin/OduExport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminOduPage() {
  const [selectedOdu, setSelectedOdu] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("list");

  const handleOduSaved = () => {
    setSelectedOdu(null);
    setActiveTab("list");
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditOdu = (oduId: string) => {
    setSelectedOdu(oduId);
    setActiveTab("editor");
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gerenciar Odu"
        description="Visualize, edite ou exclua os 256 Odu de Ifá"
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
                setSelectedOdu("new");
                setActiveTab("editor");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Odu
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
            <TabsTrigger value="export">Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <OduList onEdit={handleEditOdu} refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="editor" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {selectedOdu ? (
                  <OduEditor
                    oduId={selectedOdu === "new" ? undefined : selectedOdu}
                    onSaved={handleOduSaved}
                    onCancel={() => {
                      setSelectedOdu(null);
                      setActiveTab("list");
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Selecione um Odu da lista para editar
                    </p>
                    <Button
                      onClick={() => {
                        setSelectedOdu("new");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Novo Odu
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <BulkUpload
                  onSuccess={() => {
                    setRefreshTrigger((prev) => prev + 1);
                    setActiveTab("list");
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <OduExport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
