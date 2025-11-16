import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const { supported, permission, requestPermission } = useNotifications();

  useEffect(() => {
    // Check if user has already been prompted
    const hasBeenPrompted = localStorage.getItem('notificationPrompted');
    const shouldShow = supported && permission.prompt && !hasBeenPrompted;
    
    if (shouldShow) {
      // Show after 10 seconds on the page
      const timer = setTimeout(() => {
        setShow(true);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [supported, permission]);

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      localStorage.setItem('notificationPrompted', 'true');
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationPrompted', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50 max-w-md"
      >
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="relative pb-3">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Ativar Notificações</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription>
              Receba lembretes para estudar diariamente, manter seu streak e revisar os Odu no
              momento certo!
            </CardDescription>
            <div className="flex flex-col gap-2">
              <Button onClick={handleEnable} className="w-full">
                <Bell className="h-4 w-4 mr-2" />
                Ativar Notificações
              </Button>
              <Button variant="ghost" onClick={handleDismiss} className="w-full">
                Agora Não
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
