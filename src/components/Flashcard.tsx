import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";

interface FlashcardProps {
  numero: number;
  nome: string;
  texto: string;
  verso?: string | null;
  onRate: (difficulty: number) => void;
}

export default function Flashcard({ numero, nome, texto, verso, onRate }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card 
        className="min-h-[400px] cursor-pointer transition-all hover:shadow-lg"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              #{numero}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(!isFlipped);
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-2xl mt-4">{nome}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isFlipped ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                Clique para revelar o conteúdo
              </p>
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <RotateCcw className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Texto Principal:</h4>
                <p className="text-foreground leading-relaxed">{texto}</p>
              </div>

              {verso && (
                <div>
                  <h4 className="font-semibold mb-2">Verso:</h4>
                  <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                    {verso}
                  </blockquote>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isFlipped && (
        <div className="mt-6 space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Quão fácil foi memorizar este Odu?
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onRate(1)}
            >
              Difícil
            </Button>
            <Button
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
              onClick={() => onRate(3)}
            >
              Médio
            </Button>
            <Button
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
              onClick={() => onRate(5)}
            >
              Fácil
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
