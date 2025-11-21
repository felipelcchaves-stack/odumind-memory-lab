import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BookOpen, Flame, Heart, Sparkles, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MemorizationStatusBadge from "@/components/MemorizationStatusBadge";

interface ContentType {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  icon: string;
  ordem: number;
}

interface Content {
  id: string;
  numero: number | null;
  nome: string;
  dificuldade: string | null;
  tempo_execucao: number | null;
  tags: string[] | null;
  content_type_id: string;
  materiais_necessarios: string[] | null;
}

interface Progress {
  status: string;
  vezes_praticado?: number;
}

const iconMap: Record<string, any> = {
  BookOpen,
  Flame,
  Heart,
  Sparkles,
};

export default function BibliotecaYoruba() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [selectedType, setSelectedType] = useState<string>("odu");
  const [content, setContent] = useState<Content[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadContentTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      loadContent();
    }
  }, [selectedType, user]);

  const loadContentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('content_types')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setContentTypes(data || []);
    } catch (error) {
      console.error('Error loading content types:', error);
      toast.error("Erro ao carregar tipos de conteúdo");
    }
  };

  const loadContent = async () => {
    setLoading(true);
    try {
      if (selectedType === 'odu') {
        // Load Odu
        const { data: oduData, error: oduError } = await supabase
          .from('odu')
          .select('id, numero, nome, tags')
          .order('numero');

        if (oduError) throw oduError;

        // Load memorization progress
        if (user) {
          const { data: memData } = await supabase
            .from('memorizacao')
            .select('odu_id, status, revisoes')
            .eq('user_id', user.id);

          const progressMap: Record<string, Progress> = {};
          memData?.forEach(m => {
            progressMap[m.odu_id] = { status: m.status };
          });
          setProgress(progressMap);
        }

        setContent(oduData?.map(o => ({
          ...o,
          content_type_id: '',
          dificuldade: null,
          tempo_execucao: null,
          materiais_necessarios: null,
        })) || []);
      } else {
        // Load ritual content
        const typeData = contentTypes.find(ct => ct.slug === selectedType);
        if (!typeData) return;

        const { data: ritualData, error: ritualError } = await supabase
          .from('ritual_content')
          .select('*')
          .eq('content_type_id', typeData.id)
          .order('numero');

        if (ritualError) throw ritualError;

        // Load ritual progress
        if (user) {
          const { data: progData } = await supabase
            .from('user_ritual_progress')
            .select('ritual_id, status, vezes_praticado')
            .eq('user_id', user.id);

          const progressMap: Record<string, Progress> = {};
          progData?.forEach(p => {
            progressMap[p.ritual_id] = { 
              status: p.status,
              vezes_praticado: p.vezes_praticado 
            };
          });
          setProgress(progressMap);
        }

        setContent(ritualData || []);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error("Erro ao carregar conteúdo");
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = content.filter(item => {
    // Search filter
    if (searchQuery && !item.nome.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Difficulty filter
    if (difficultyFilter !== 'all' && item.dificuldade !== difficultyFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const itemProgress = progress[item.id];
      if (statusFilter === 'nao_estudado' && itemProgress?.status) {
        return false;
      }
      if (statusFilter !== 'nao_estudado' && itemProgress?.status !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  const handleCardClick = (item: Content) => {
    if (selectedType === 'odu') {
      navigate(`/odu/${item.id}`);
    } else {
      navigate(`/ritual/${item.id}`);
    }
  };

  const getDifficultyColor = (dificuldade: string | null) => {
    if (!dificuldade) return "bg-muted text-muted-foreground";
    switch (dificuldade) {
      case 'iniciante':
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case 'intermediario':
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case 'avancado':
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Biblioteca Yorubá</h1>
        <p className="text-muted-foreground">
          Explore os 256 Odu Ifá, rituais, rezas e invocações sagradas
        </p>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          {contentTypes.map(type => {
            const Icon = iconMap[type.icon] || BookOpen;
            return (
              <TabsTrigger key={type.slug} value={type.slug} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{type.nome}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {contentTypes.map(type => (
          <TabsContent key={type.slug} value={type.slug} className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder={`Buscar ${type.nome.toLowerCase()}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {type.slug !== 'odu' && (
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Dificuldade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediario">Intermediário</SelectItem>
                        <SelectItem value="avancado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="nao_estudado">Não Estudado</SelectItem>
                      <SelectItem value="estudando">Estudando</SelectItem>
                      <SelectItem value={type.slug === 'odu' ? 'memorizado' : 'praticado'}>
                        {type.slug === 'odu' ? 'Memorizado' : 'Praticado'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredContent.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">Nenhum conteúdo encontrado</p>
                </div>
              ) : (
                filteredContent.map(item => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleCardClick(item)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          {item.numero && (
                            <Badge variant="outline" className="mb-2">
                              #{item.numero}
                            </Badge>
                          )}
                          <h3 className="font-semibold text-lg">{item.nome}</h3>
                        </div>
                        {user && (
                          <MemorizationStatusBadge 
                            status={progress[item.id]?.status as any || "nao_estudado"} 
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.dificuldade && (
                          <Badge className={getDifficultyColor(item.dificuldade)}>
                            {item.dificuldade}
                          </Badge>
                        )}
                        {item.tempo_execucao && (
                          <Badge variant="secondary">
                            {item.tempo_execucao} min
                          </Badge>
                        )}
                        {item.materiais_necessarios && item.materiais_necessarios.length > 0 && (
                          <Badge variant="outline">
                            {item.materiais_necessarios.length} materiais
                          </Badge>
                        )}
                        {progress[item.id]?.vezes_praticado && progress[item.id].vezes_praticado! > 0 && (
                          <Badge variant="secondary">
                            {progress[item.id].vezes_praticado}x praticado
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}