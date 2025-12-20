import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, Sparkles } from 'lucide-react';
import { useUserReview } from '@/hooks/useUserReview';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const REVIEW_DISMISSED_KEY = 'review_prompt_dismissed_at';
const DAYS_UNTIL_SHOW_AGAIN = 15;

// Check if enough time has passed since last dismissal
const canShowReviewPrompt = (): boolean => {
  const dismissedAt = localStorage.getItem(REVIEW_DISMISSED_KEY);
  if (!dismissedAt) return true;
  
  const dismissedDate = new Date(dismissedAt);
  const daysSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceDismissal >= DAYS_UNTIL_SHOW_AGAIN;
};

export const ReviewPrompt = () => {
  const { 
    userReview, 
    userXp, 
    settings, 
    loading, 
    canReview, 
    hasReviewed, 
    submitReview 
  } = useUserReview();
  
  // IMPORTANTE: Começar FECHADO e só abrir após verificar tudo
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(userReview?.comment || '');
  const [displayName, setDisplayName] = useState(userReview?.display_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState(false);

  // Decidir se deve abrir APÓS os dados carregarem
  useEffect(() => {
    const canShow = canShowReviewPrompt();
    
    console.log('[ReviewPrompt] Verificando se deve abrir:', {
      loading,
      hasReviewed,
      canReview,
      canShowFromLocalStorage: canShow,
      isOpen
    });

    // Só abre se: não está carregando, pode avaliar, não avaliou ainda e não dispensou recentemente
    if (!loading && canReview && !hasReviewed && canShow) {
      console.log('[ReviewPrompt] ✅ Abrindo modal de avaliação');
      setIsOpen(true);
    } else if (!loading && hasReviewed) {
      console.log('[ReviewPrompt] ❌ Usuário já avaliou, mantendo fechado');
      setIsOpen(false);
    }
  }, [loading, hasReviewed, canReview]);

  // Handle dialog close - save dismissal timestamp
  const handleOpenChange = (open: boolean) => {
    console.log('[ReviewPrompt] handleOpenChange:', open);
    if (!open) {
      // User closed the modal - save timestamp
      const now = new Date().toISOString();
      localStorage.setItem(REVIEW_DISMISSED_KEY, now);
      console.log('[ReviewPrompt] 📝 Salvando dismissal timestamp:', now);
    }
    setIsOpen(open);
  };

  // Não renderizar nada enquanto carrega ou se não pode/não deve mostrar
  if (loading || !canReview) {
    return null;
  }

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    if (!displayName.trim()) {
      setNameError(true);
      return;
    }
    
    setIsSubmitting(true);
    const success = await submitReview(rating, comment, displayName);
    setIsSubmitting(false);
    
    if (success) {
      // Confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      if (!hasReviewed) {
        setIsOpen(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {hasReviewed ? 'Editar sua avaliação' : 'Avalie o Isesemind!'}
          </DialogTitle>
          <DialogDescription>
            {hasReviewed 
              ? 'Você pode atualizar sua avaliação a qualquer momento'
              : 'Sua opinião é muito importante para nós. Ganhe +50 XP!'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Como você avalia sua experiência?</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      (hoveredRating || rating) >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Display Name - REQUIRED */}
          <div className="space-y-2">
            <Label htmlFor="displayName">
              Como quer ser chamado? <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              placeholder="Ex: Bàbá João, Ìyá Maria..."
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (e.target.value.trim()) setNameError(false);
              }}
              maxLength={50}
              className={nameError ? 'border-destructive' : ''}
            />
            {nameError && (
              <p className="text-xs text-destructive">
                Por favor, informe como deseja ser chamado
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Deixe um comentário (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Conte-nos sobre sua experiência com o Isesemind..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/200
            </p>
          </div>

          {/* Info about 5-star reviews */}
          {rating === 5 && (
            <p className="text-sm text-primary bg-primary/10 p-2 rounded-md">
              ⭐ Avaliações 5 estrelas podem ser exibidas em nossa página inicial!
            </p>
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || !displayName.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Enviando...' : hasReviewed ? 'Atualizar Avaliação' : 'Enviar Avaliação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
