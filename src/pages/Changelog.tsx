import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardHeader from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Wrench, ArrowLeft, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChangelogItem {
  tipo: "novo" | "melhoria" | "correcao";
  titulo: string;
  descricao: string;
  icone?: string;
}

interface ChangelogVersion {
  id: string;
  version: string;
  titulo: string;
  release_date: string;
  items: ChangelogItem[];
  destaque: boolean;
  created_at: string;
}

const getTypeIcon = (tipo: string) => {
  switch (tipo) {
    case "novo":
      return <Sparkles className="h-4 w-4" />;
    case "melhoria":
      return <Zap className="h-4 w-4" />;
    case "correcao":
      return <Wrench className="h-4 w-4" />;
    default:
      return null;
  }
};

const getTypeBadge = (tipo: string) => {
  switch (tipo) {
    case "novo":
      return <Badge className="bg-primary">✨ Novo</Badge>;
    case "melhoria":
      return <Badge className="bg-accent">🚀 Melhoria</Badge>;
    case "correcao":
      return <Badge variant="secondary">🔧 Correção</Badge>;
    default:
      return null;
  }
};

export default function Changelog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [changelogs, setChangelogs] = useState<ChangelogVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("todos");

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    loadChangelogs();
  }, [user, navigate]);

  const loadChangelogs = async () => {
    try {
      const { data, error } = await supabase
        .from("changelog")
        .select("*")
        .order("release_date", { ascending: false });

      if (error) throw error;

      setChangelogs(data.map(item => ({
        ...item,
        items: item.items as unknown as ChangelogItem[]
      })) as ChangelogVersion[]);
    } catch (error) {
      console.error("Error loading changelogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = (items: ChangelogItem[]) => {
    if (filterType === "todos") return items;
    return items.filter((item) => item.tipo === filterType);
  };

  const getFilteredChangelogs = () => {
    if (filterType === "todos") return changelogs;
    return changelogs
      .map((changelog) => ({
        ...changelog,
        items: filterItems(changelog.items),
      }))
      .filter((changelog) => changelog.items.length > 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              Novidades e Atualizações
            </h1>
            <p className="text-muted-foreground">
              Acompanhe todas as melhorias e novidades do sistema
            </p>
          </div>

          <Tabs value={filterType} onValueChange={setFilterType} className="mb-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="novo" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Novos
              </TabsTrigger>
              <TabsTrigger value="melhoria" className="gap-2">
                <Zap className="h-4 w-4" />
                Melhorias
              </TabsTrigger>
              <TabsTrigger value="correcao" className="gap-2">
                <Wrench className="h-4 w-4" />
                Correções
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {getFilteredChangelogs().length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Nenhuma atualização encontrada para este filtro.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                getFilteredChangelogs().map((changelog) => {
                  const groupedItems = changelog.items.reduce(
                    (acc, item) => {
                      if (!acc[item.tipo]) {
                        acc[item.tipo] = [];
                      }
                      acc[item.tipo].push(item);
                      return acc;
                    },
                    {} as Record<string, ChangelogItem[]>
                  );

                  return (
                    <Card key={changelog.id} className="animate-fade-in">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                              {changelog.titulo}
                              {changelog.destaque && (
                                <Badge variant="default" className="animate-pulse">
                                  Destaque
                                </Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {new Date(changelog.release_date).toLocaleDateString("pt-BR")}
                              </span>
                              <Badge variant="outline">{changelog.version}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {groupedItems.novo && groupedItems.novo.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                {getTypeBadge("novo")}
                              </div>
                              <div className="space-y-3">
                                {groupedItems.novo.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                                  >
                                    <div className="flex-shrink-0 text-2xl">
                                      {item.icone || "✨"}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold mb-1">{item.titulo}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {item.descricao}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {groupedItems.melhoria && groupedItems.melhoria.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                {getTypeBadge("melhoria")}
                              </div>
                              <div className="space-y-3">
                                {groupedItems.melhoria.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20"
                                  >
                                    <div className="flex-shrink-0 text-2xl">
                                      {item.icone || "🚀"}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold mb-1">{item.titulo}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {item.descricao}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {groupedItems.correcao && groupedItems.correcao.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                {getTypeBadge("correcao")}
                              </div>
                              <div className="space-y-3">
                                {groupedItems.correcao.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                                  >
                                    <div className="flex-shrink-0 text-2xl">
                                      {item.icone || "🔧"}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold mb-1">{item.titulo}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {item.descricao}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
