import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface XPNotificationProps {
  xp: number;
  show: boolean;
  onComplete?: () => void;
}

export default function XPNotification({ xp, show, onComplete }: XPNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.5 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-primary text-primary-foreground px-6 py-4 rounded-full shadow-xl flex items-center gap-3">
            <Sparkles className="h-6 w-6 animate-pulse" />
            <span className="text-xl font-bold">+{xp} XP</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
