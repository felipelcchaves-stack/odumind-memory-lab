import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Download, Smartphone, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAInstallBanner() {
  const navigate = useNavigate();
  const { 
    isInstalled, 
    isInstallable, 
    isIOS, 
    isMobile,
    wasDismissed, 
    promptInstall, 
    dismissPrompt 
  } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(true);

  // Don't show if already installed, dismissed, or not on mobile/installable
  if (isInstalled || wasDismissed || !isVisible || (!isMobile && !isInstallable)) {
    return null;
  }

  const handleInstall = async () => {
    if (isInstallable) {
      await promptInstall();
    } else {
      navigate('/instalar');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    dismissPrompt();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mx-4 mb-4 md:mx-6"
      >
        <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-xl p-4 shadow-sm">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-background/50 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-4 pr-8">
            <div className="hidden sm:flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                Instale o IseseMind no seu celular!
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Acesso rápido e estude mesmo offline.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/instalar')}
                className="hidden sm:flex text-xs"
              >
                Ver como
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="sm"
                onClick={handleInstall}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isInstallable ? 'Instalar' : isIOS ? 'Ver como' : 'Instalar'}
                </span>
                <span className="sm:hidden">Instalar</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
