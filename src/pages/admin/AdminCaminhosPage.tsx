import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CaminhoList from "@/components/admin/CaminhoList";
import CaminhoEditor from "@/components/admin/CaminhoEditor";
import PathContentManager from "@/components/admin/PathContentManager";
import PathContentBulkUpload from "@/components/admin/PathContentBulkUpload";

export default function AdminCaminhosPage() {
  const [selectedCaminho, setSelectedCaminho] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("list");

  const handleCaminhoSaved = () => {
    setSelectedCaminho(null);
    setActiveTab("list");
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditCaminho = (caminhoId: string) => {
    setSelectedCaminho(caminhoId);
    setActiveTab("editor");
  };

  const handleManageContent = (caminhoId: string) => {
    setSelectedCaminho(caminhoId);
    setActiveTab("content");
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Gerenciar Caminhos"
        description="Crie e gerencie os caminhos de aprendizado (cursos)"
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
                setSelectedCaminho("new");
                setActiveTab("editor");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Caminho
            </Button>
          </>
        }
      />

      <div className="container px-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="content">Conteúdos</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <CaminhoList 
                  onEdit={handleEditCaminho} 
                  onManageContent={handleManageContent}
                  refreshTrigger={refreshTrigger} 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="editor" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {selectedCaminho ? (
                  <CaminhoEditor
                    caminhoId={selectedCaminho === "new" ? undefined : selectedCaminho}
                    onSaved={handleCaminhoSaved}
                    onCancel={() => {
                      setSelectedCaminho(null);
                      setActiveTab("list");
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Selecione um Caminho da lista para editar
                    </p>
                    <Button
                      onClick={() => {
                        setSelectedCaminho("new");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Novo Caminho
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {selectedCaminho && selectedCaminho !== "new" ? (
                  <PathContentManager
                    pathId={selectedCaminho}
                    onBack={() => {
                      setSelectedCaminho(null);
                      setActiveTab("list");
                    }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Selecione um Caminho da lista para gerenciar seus conteúdos
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("list")}
                    >
                      Ver Lista de Caminhos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <PathContentBulkUpload
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
