import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Sparkles, Lightbulb, Tag, Users } from "lucide-react";
import { toast } from "sonner";
import { MnemonicsSection } from "@/components/MnemonicsSection";
import { ElaborativeEncoding } from "@/components/ElaborativeEncoding";
import { PersonalNotes } from "@/components/PersonalNotes";
import { useSubscription } from "@/hooks/useSubscription";
import { ProtectedContent } from "@/components/ProtectedContent";
import DashboardHeader from "@/components/DashboardHeader";
import { SafeHtmlRenderer } from "@/components/SafeHtmlRenderer";

interface Odu {
  id: string;
  numero: number;
  nome: string;
  texto_principal: string;
  verso: string | null;
  significado: string | null;
  exemplos_praticos: string | null;
  tags: string[] | null;
  contexto_historico?: string | null;
  personagens?: string | null;
  tema_principal?: string | null;
  tema_secundario?: string | null;
}

export default function OduStudy() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [odu, setOdu] = useState<Odu | null>(null);
  const [loading, setLoading] = useState(true);
  const { hasActiveSubscription, loading: subLoading } = useSubscription();

  const FREE_LIMIT = 5;

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
      
      // Check premium access
      const isPremium = data.numero > FREE_LIMIT;
      if (isPremium && !subLoading && !hasActiveSubscription()) {
        toast.error("Este Odu é premium. Faça upgrade para acessar!");
        navigate("/subscription");
        return;
      }
      
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
    <ProtectedContent>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Contexto Narrativo */}
          {(odu.contexto_historico || odu.personagens || odu.tema_principal) && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Contexto da História
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {odu.contexto_historico && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      📖 Onde essa história acontece
                    </p>
                    <p className="text-base leading-relaxed">{odu.contexto_historico}</p>
                  </div>
                )}
                
                {odu.personagens && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Personagens
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {odu.personagens.split(',').map((p, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm">{p.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {(odu.tema_principal || odu.tema_secundario) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      🎭 Temas
                    </p>
                    <div className="flex gap-2">
                      {odu.tema_principal && (
                        <Badge className="bg-primary capitalize text-sm">{odu.tema_principal}</Badge>
                      )}
                      {odu.tema_secundario && (
                        <Badge variant="outline" className="capitalize text-sm">{odu.tema_secundario}</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Main Content Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-muted-foreground">
                #{odu.numero}
              </Badge>
              <Badge variant="outline" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Texto Principal
              </Badge>
            </div>
            <CardTitle className="text-3xl">{odu.nome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Texto Principal */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Texto Principal</h3>
              </div>
              <SafeHtmlRenderer
                html={odu.texto_principal}
                className="text-foreground leading-relaxed text-lg prose prose-sm dark:prose-invert max-w-none"
              />
            </div>

            {odu.verso && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Verso</h3>
                  </div>
                  <SafeHtmlRenderer
                    html={odu.verso}
                    className="border-l-4 border-primary pl-4 italic text-muted-foreground text-lg prose prose-sm dark:prose-invert"
                  />
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
                  <SafeHtmlRenderer
                    html={odu.significado}
                    className="text-foreground leading-relaxed text-lg prose prose-sm dark:prose-invert max-w-none"
                  />
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
                  <SafeHtmlRenderer
                    html={odu.exemplos_praticos}
                    className="text-foreground leading-relaxed text-lg prose prose-sm dark:prose-invert max-w-none"
                  />
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

        {/* Personal Notes Section */}
        <PersonalNotes odu={odu} />

        {/* Mnemonics Section */}
        <MnemonicsSection odu={odu} />

        {/* Elaborative Encoding Section */}
        <ElaborativeEncoding odu={odu} />

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
    </ProtectedContent>
  );
}
