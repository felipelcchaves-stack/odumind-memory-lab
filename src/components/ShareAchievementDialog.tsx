import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, Loader2, Twitter, MessageCircle, Instagram, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareAchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: {
    titulo: string;
    descricao: string;
    icone: string;
    tipo: string;
    valor_conquista: number;
  };
}

export function ShareAchievementDialog({ open, onOpenChange, achievement }: ShareAchievementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateImage = async () => {
    if (imageUrl) return; // Already generated
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-achievement-share-image', {
        body: {
          titulo: achievement.titulo,
          descricao: achievement.descricao,
          icone: achievement.icone,
          tipo: achievement.tipo,
          valor_conquista: achievement.valor_conquista
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setImageUrl(data.imageUrl);
        toast.success("Imagem gerada com sucesso!");
      } else {
        throw new Error("Nenhuma imagem foi gerada");
      }
    } catch (error) {
      console.error('Error generating share image:', error);
      toast.error("Erro ao gerar imagem de compartilhamento");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!imageUrl) return;

    try {
      // Convert base64 to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conquista-${achievement.titulo.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Imagem baixada!");
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error("Erro ao baixar imagem");
    }
  };

  const shareText = `🎉 Acabei de conquistar: ${achievement.titulo}!\n\n${achievement.descricao}\n\n#IseseMind #Conquista #Yoruba`;

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Texto copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar texto");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !imageUrl) {
      generateImage();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Compartilhar Conquista
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative aspect-[1.91/1] bg-muted rounded-lg overflow-hidden border-2 border-border">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Gerando imagem...</p>
                </div>
              </div>
            ) : imageUrl ? (
              <img 
                src={imageUrl} 
                alt={achievement.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">A imagem será gerada automaticamente</p>
              </div>
            )}
          </div>

          {/* Share Text Preview */}
          <div className="relative bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm whitespace-pre-wrap">{shareText}</p>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={copyShareText}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Compartilhar em:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={shareToWhatsApp}
                disabled={loading}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={shareToTwitter}
                disabled={loading}
                className="gap-2"
              >
                <Twitter className="h-4 w-4 text-blue-500" />
                Twitter/X
              </Button>
              <Button
                variant="outline"
                onClick={downloadImage}
                disabled={loading || !imageUrl}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar Imagem
              </Button>
              <Button
                variant="outline"
                disabled
                className="gap-2 opacity-50"
                title="Compartilhamento direto para Instagram em breve"
              >
                <Instagram className="h-4 w-4 text-pink-600" />
                Instagram (Em breve)
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            💡 Para Instagram: baixe a imagem e compartilhe diretamente no app
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
