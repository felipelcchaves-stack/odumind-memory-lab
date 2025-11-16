import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import { toast } from "sonner";
import DashboardHeader from "@/components/DashboardHeader";

interface Odu {
  id: string;
  numero: number;
  nome: string;
  texto_principal: string;
  verso: string | null;
  significado: string | null;
  exemplos_praticos: string | null;
  tags: string[] | null;
}

export default function OduLibrary() {
  const navigate = useNavigate();
  const [odus, setOdus] = useState<Odu[]>([]);
  const [filteredOdus, setFilteredOdus] = useState<Odu[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

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

  if (loading) {
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
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto px-4 py-8">
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

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
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
          {filteredOdus.map((odu) => (
            <Card key={odu.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    #{odu.numero}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{odu.nome}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {odu.texto_principal}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {odu.tags && odu.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {odu.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {odu.verso && (
                  <blockquote className="border-l-4 border-primary pl-4 italic text-sm text-muted-foreground mb-4">
                    {odu.verso}
                  </blockquote>
                )}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/odu/${odu.id}`)}
                >
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
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
