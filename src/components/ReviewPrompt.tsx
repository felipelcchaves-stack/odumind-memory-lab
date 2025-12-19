import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, X, Sparkles } from 'lucide-react';
import { useUserReview } from '@/hooks/useUserReview';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

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
  
  const [isOpen, setIsOpen] = useState(true);
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(userReview?.comment || '');
  const [displayName, setDisplayName] = useState(userReview?.display_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading || !canReview || !isOpen) {
    return null;
  }

  // Don't show if already reviewed (unless they want to edit)
  if (hasReviewed && !userReview) {
    return null;
  }

  const handleSubmit = async () => {
    if (rating === 0) return;
    
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

  const xpNeeded = settings.minXp - userXp;
  const xpProgress = Math.min(100, (userXp / settings.minXp) * 100);

  return (
    <Card className="relative border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={() => setIsOpen(false)}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">
            {hasReviewed ? 'Editar sua avaliação' : 'Avalie o Isesemind!'}
          </CardTitle>
        </div>
        <CardDescription>
          {hasReviewed 
            ? 'Você pode atualizar sua avaliação a qualquer momento'
            : 'Sua opinião é muito importante para nós. Ganhe +50 XP!'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Como quer ser chamado? (opcional)</Label>
          <Input
            id="displayName"
            placeholder="Ex: Bàbá João, Ìyá Maria..."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
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
          disabled={rating === 0 || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Enviando...' : hasReviewed ? 'Atualizar Avaliação' : 'Enviar Avaliação'}
        </Button>
      </CardContent>
    </Card>
  );
};
