import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Sparkles, Lightbulb, Tag, TrendingDown } from "lucide-react";
import ForgettingCurveChart from "./ForgettingCurveChart";
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

interface OduDetailDialogProps {
  odu: Odu | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OduDetailDialog({ odu, open, onOpenChange }: OduDetailDialogProps) {
  useEffect(() => {
    if (!open) return;

    // Bloqueio de cópia (Ctrl+C, Cmd+C)
    const handleCopy = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Bloqueio de print screen
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueio de Print Screen, Ctrl+P, Cmd+P
      if (
        e.key === "PrintScreen" ||
        ((e.ctrlKey || e.metaKey) && e.key === "p")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Bloqueio de menu de contexto (botão direito)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Bloqueio de seleção de texto
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    // Detectar tentativa de screenshot (blur na saída da janela)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Usuário saiu da aba, possível screenshot
        console.warn("⚠️ Tentativa de captura detectada");
      }
    };

    document.addEventListener("keydown", handleCopy);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("keydown", handleCopy);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [open]);

  if (!odu) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[85vh]"
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className="text-xl px-4 py-2">
              #{odu.numero}
            </Badge>
            <DialogTitle className="text-3xl">{odu.nome}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Detalhes completos do Odu {odu.nome}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="content" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Conteúdo
              </TabsTrigger>
              <TabsTrigger value="curve" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Curva de Esquecimento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6 mt-0" style={{ userSelect: "none" }}>
              {/* Texto Principal */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Texto Principal</h3>
                </div>
                <SafeHtmlRenderer
                  html={odu.texto_principal}
                  className="text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                />
              </div>

              <Separator />

              {/* Verso Resumido */}
              {odu.verso_resumido && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                      <h3 className="text-lg font-semibold">Verso Resumido (Memorização)</h3>
                    </div>
                    <div className="bg-primary/10 dark:bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
                      <p className="text-lg italic font-medium text-foreground">
                        "{odu.verso_resumido}"
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Use este verso curto para memorizar o Odu rapidamente
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Verso */}
              {odu.verso && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Verso Completo</h3>
                    </div>
                    <SafeHtmlRenderer
                      html={odu.verso}
                      className="border-l-4 border-primary pl-4 italic text-muted-foreground prose prose-sm dark:prose-invert"
                    />
                  </div>
                  <Separator />
                </>
              )}

              {/* Significado */}
              {odu.significado && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Significado</h3>
                    </div>
                    <SafeHtmlRenderer
                      html={odu.significado}
                      className="text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                    />
                  </div>
                  <Separator />
                </>
              )}

              {/* Exemplos Práticos */}
              {odu.exemplos_praticos && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Exemplos Práticos</h3>
                    </div>
                    <SafeHtmlRenderer
                      html={odu.exemplos_praticos}
                      className="text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                    />
                  </div>
                  <Separator />
                </>
              )}

              {/* Tags */}
              {odu.tags && odu.tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Tags</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {odu.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Marca d'água invisível */}
              <div 
                className="opacity-0 pointer-events-none absolute"
                aria-hidden="true"
                style={{ 
                  position: 'fixed', 
                  top: '50%', 
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '2rem',
                  color: 'rgba(0,0,0,0.03)',
                  zIndex: -1 
                }}
              >
                Propriedade Protegida • Não Copiar
              </div>
            </TabsContent>

            <TabsContent value="curve" className="mt-0">
              <ForgettingCurveChart 
                oduId={odu.id}
                oduNome={odu.nome}
                oduNumero={odu.numero}
              />
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Overlay de aviso ao tentar copiar */}
        <div className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t">
          ⚠️ Conteúdo protegido - Cópia e captura de tela desabilitadas
        </div>
      </DialogContent>
    </Dialog>
  );
}
