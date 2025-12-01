import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Lock, Crown, CheckCircle, Clock, Circle } from "lucide-react";
import { toast } from "sonner";
import DashboardHeader from "@/components/DashboardHeader";
import { useSubscription } from "@/hooks/useSubscription";
import { useAdmin } from "@/hooks/useAdmin";
import UpgradeBanner from "@/components/UpgradeBanner";
import { SafeHtmlRenderer } from "@/components/SafeHtmlRenderer";

interface Odu {
  id: string;
  numero: number;
  nome: string;
  texto_principal: string;
  verso: string | null;
  verso_resumido: string | null;
  significado: string | null;
  exemplos_praticos: string | null;
  tags: string[] | null;
}

export default function OduLibrary() {
  const navigate = useNavigate();
  const [odus, setOdus] = useState<Odu[]>([]);
  const [filteredOdus, setFilteredOdus] = useState<Odu[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_studied' | 'studying' | 'memorized'>('all');
  const [loading, setLoading] = useState(true);
  const { subscription, loading: subLoading, hasActiveSubscription } = useSubscription();
  const { isAdmin, isColaborador, loading: adminLoading } = useAdmin();

  const FREE_LIMIT = 5; // Primeiros 5 Odu são gratuitos (por quantidade, não pelo campo numero)
  
  // Verificar se tem acesso total (assinante, admin ou colaborador)
  const hasFullAccess = hasActiveSubscription() || isAdmin || isColaborador;

  useEffect(() => {
    fetchOdus();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = odus.filter(
        (odu) =>
          odu.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          odu.numero.toString().includes(searchTerm) ||
          odu.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredOdus(filtered);
    } else {
      setFilteredOdus(odus);
    }
  }, [searchTerm, odus]);

  async function fetchOdus() {
    try {
      const { data, error } = await supabase
        .from("odu")
        .select("*")
        .order("numero", { ascending: true });

      if (error) throw error;
      setOdus(data || []);
      setFilteredOdus(data || []);
    } catch (error) {
      console.error("Error fetching Odus:", error);
      toast.error("Erro ao carregar os Odu");
    } finally {
      setLoading(false);
    }
  }

  const handleOduClick = (odu: Odu, oduIndex: number) => {
    // Verificar se é premium baseado no ÍNDICE na lista (não no campo numero)
    const isPremium = oduIndex >= FREE_LIMIT;
    
    if (isPremium && !hasFullAccess) {
      toast.error('Este Odu é premium. Faça upgrade para acessar!');
      navigate('/subscription');
      return;
    }
    
    navigate(`/odu/${odu.id}`);
  };

  if (loading || subLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-tour="odu-library">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Upgrade Banner */}
        {!hasFullAccess && (
          <UpgradeBanner message={`Você está no plano gratuito com acesso aos primeiros ${FREE_LIMIT} Odu. Faça upgrade para desbloquear todos os ${odus.length} Odu Ifá!`} />
        )}
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Biblioteca de Odu</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Explore os {odus.length} Odu Ifá e aprofunde seu conhecimento
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Todos
            </Button>
            <Button
              variant={statusFilter === 'not_studied' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('not_studied')}
              className="gap-2"
            >
              <Circle className="h-4 w-4" />
              Não Estudados
            </Button>
            <Button
              variant={statusFilter === 'studying' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('studying')}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Estudando
            </Button>
            <Button
              variant={statusFilter === 'memorized' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('memorized')}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Memorizados
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md" data-tour="search-bar">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar por nome, número ou tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Odu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOdus.map((odu, index) => {
            // isPremium baseado no ÍNDICE na lista ordenada (não no campo numero)
            const isPremium = index >= FREE_LIMIT;
            const isLocked = isPremium && !hasFullAccess;
            
            return (
              <Card 
                key={odu.id} 
                className={`hover:shadow-lg transition-shadow ${isLocked ? 'opacity-75' : 'cursor-pointer'}`}
                data-tour={odu.numero === 1 ? "odu-card" : undefined}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      #{odu.numero}
                    </Badge>
                    {isPremium && (
                      <Badge variant="default" className="bg-gradient-secondary">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {odu.nome}
                    {isLocked && <Lock className="h-5 w-5 text-muted-foreground" />}
                  </CardTitle>
                  {odu.verso_resumido && !isLocked && (
                    <CardDescription className="italic text-sm mb-2">
                      💬 "{odu.verso_resumido}"
                    </CardDescription>
                  )}
                  {isLocked ? (
                    <CardDescription className="line-clamp-2">
                      Conteúdo bloqueado. Faça upgrade para acessar.
                    </CardDescription>
                  ) : (
                    <SafeHtmlRenderer
                      html={odu.texto_principal}
                      className="text-sm text-muted-foreground line-clamp-2 prose prose-sm dark:prose-invert max-w-none"
                    />
                  )}
                </CardHeader>
                <CardContent>
                  {!isLocked && (
                    <>
                      {odu.tags && odu.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {odu.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {odu.verso && (
                        <SafeHtmlRenderer
                          html={odu.verso}
                          className="border-l-4 border-primary pl-4 italic text-sm text-muted-foreground mb-4 prose prose-sm dark:prose-invert max-w-none"
                        />
                      )}
                    </>
                  )}
                  <Button 
                    variant={isLocked ? "default" : "outline"}
                    className={isLocked ? "w-full bg-gradient-secondary" : "w-full"}
                    onClick={() => handleOduClick(odu, index)}
                  >
                    {isLocked ? (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Fazer Upgrade
                      </>
                    ) : (
                      'Ver Detalhes'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredOdus.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum Odu encontrado para "{searchTerm}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
