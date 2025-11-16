import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Sparkles, Lightbulb, Tag } from "lucide-react";
import { toast } from "sonner";

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

export default function OduStudy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [odu, setOdu] = useState<Odu | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (id) {
      fetchOdu();
    }
  }, [id, user]);

  useEffect(() => {
    if (!odu) return;

    // Anti-copy protections
    const handleCopy = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        toast.error("Cópia desabilitada para proteção do conteúdo");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || ((e.ctrlKey || e.metaKey) && e.key === "p")) {
        e.preventDefault();
        toast.error("Captura de tela desabilitada");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error("Botão direito desabilitado para proteção do conteúdo");
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("keydown", handleCopy);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("keydown", handleCopy);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, [odu]);

  async function fetchOdu() {
    try {
      const { data, error } = await supabase
        .from("odu")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setOdu(data);

      // Create or update memorization record
      if (user) {
        await initMemorization(data.id);
      }
    } catch (error) {
      console.error("Error fetching Odu:", error);
      toast.error("Erro ao carregar Odu");
      navigate("/odu");
    } finally {
      setLoading(false);
    }
  }

  async function initMemorization(oduId: string) {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from("memorizacao")
        .select("*")
        .eq("user_id", user.id)
        .eq("odu_id", oduId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("memorizacao").insert({
          user_id: user.id,
          odu_id: oduId,
          status: "estudando",
        });
      }
    } catch (error) {
      console.error("Error initializing memorization:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando Odu...</p>
        </div>
      </div>
    );
  }

  if (!odu) return null;

  return (
    <div 
      className="min-h-screen bg-background"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/odu")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Biblioteca
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary" className="text-2xl px-4 py-2">
              #{odu.numero}
            </Badge>
            <h1 className="text-4xl font-bold">{odu.nome}</h1>
          </div>
        </div>

        {/* Content Card */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-6">
            {/* Texto Principal */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Texto Principal</h3>
              </div>
              <p className="text-foreground leading-relaxed text-lg">
                {odu.texto_principal}
              </p>
            </div>

            {odu.verso && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Verso</h3>
                  </div>
                  <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground text-lg">
                    {odu.verso}
                  </blockquote>
                </div>
              </>
            )}

            {odu.significado && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Significado</h3>
                  </div>
                  <p className="text-foreground leading-relaxed text-lg">
                    {odu.significado}
                  </p>
                </div>
              </>
            )}

            {odu.exemplos_praticos && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Exemplos Práticos</h3>
                  </div>
                  <p className="text-foreground leading-relaxed text-lg">
                    {odu.exemplos_praticos}
                  </p>
                </div>
              </>
            )}

            {odu.tags && odu.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Tags</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {odu.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button 
            variant="hero" 
            size="lg" 
            className="flex-1"
            onClick={() => navigate("/study")}
          >
            Iniciar Sessão de Memorização
          </Button>
        </div>

        {/* Protection Notice */}
        <div className="text-xs text-muted-foreground text-center mt-6 pt-4 border-t">
          ⚠️ Conteúdo protegido - Cópia, seleção de texto e captura de tela desabilitadas
        </div>

        {/* Invisible watermark */}
        <div className="opacity-0 pointer-events-none absolute" aria-hidden="true">
          User: {user?.id} - Odu: {odu.id} - {Date.now()}
        </div>
      </div>
    </div>
  );
}
