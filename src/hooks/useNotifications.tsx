import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    prompt: false,
  });
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    setSupported(isSupported);

    if (isSupported) {
      updatePermissionState();
    }
  }, []);

  const updatePermissionState = () => {
    const current = Notification.permission;
    setPermission({
      granted: current === 'granted',
      denied: current === 'denied',
      prompt: current === 'default',
    });
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!supported) {
      toast.error('Notificações não são suportadas neste navegador');
      return false;
    }

    if (permission.denied) {
      toast.error('Permissão de notificação negada. Ative nas configurações do navegador.');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      updatePermissionState();

      if (result === 'granted') {
        toast.success('Notificações ativadas com sucesso!');
        return true;
      } else if (result === 'denied') {
        toast.error('Permissão de notificação negada');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão de notificação');
      return false;
    }
  };

  const scheduleNotification = async (
    title: string,
    body: string,
    tag: string,
    delayInMs: number
  ) => {
    if (!permission.granted) {
      console.log('Notification permission not granted');
      return;
    }

    // Schedule notification using setTimeout
    setTimeout(() => {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            tag,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: {
              url: window.location.origin,
              timestamp: Date.now(),
            },
            actions: [
              {
                action: 'study',
                title: 'Estudar Agora',
              },
              {
                action: 'dismiss',
                title: 'Lembrar Depois',
              },
            ],
          } as NotificationOptions);
        });
      }
    }, delayInMs);
  };

  const sendImmediateNotification = async (
    title: string,
    body: string,
    tag: string = 'immediate'
  ) => {
    if (!permission.granted) {
      console.log('Notification permission not granted');
      return;
    }

    if ('serviceWorker' in navigator && 'Notification' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: {
          url: window.location.origin,
          timestamp: Date.now(),
        },
      } as NotificationOptions);
    }
  };

  const scheduleDailyReminder = (hour: number, minute: number = 0) => {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delayInMs = scheduledTime.getTime() - now.getTime();

    scheduleNotification(
      '⏰ Hora de Estudar!',
      'Não esqueça de estudar os Odu hoje e manter seu streak!',
      'daily-reminder',
      delayInMs
    );

    // Store the scheduled time in localStorage
    localStorage.setItem('lastScheduledReminder', scheduledTime.toISOString());
  };

  const scheduleStreakReminder = (streakDays: number) => {
    // Schedule a reminder 2 hours before midnight if no study today
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(22, 0, 0, 0); // 10 PM

    if (reminderTime > now) {
      const delayInMs = reminderTime.getTime() - now.getTime();
      scheduleNotification(
        `🔥 Seu Streak de ${streakDays} dias!`,
        'Estude hoje para não perder seu progresso!',
        'streak-reminder',
        delayInMs
      );
    }
  };

  const scheduleReviewReminder = (reviewCount: number) => {
    if (reviewCount > 0) {
      // Schedule review reminder for 1 hour from now
      const delayInMs = 60 * 60 * 1000; // 1 hour
      scheduleNotification(
        '📚 Revisões Pendentes',
        `Você tem ${reviewCount} Odu${reviewCount > 1 ? 's' : ''} para revisar hoje!`,
        'review-reminder',
        delayInMs
      );
    }
  };

  const cancelAllNotifications = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications();
      notifications.forEach((notification) => notification.close());
    }
  };

  return {
    supported,
    permission,
    requestPermission,
    scheduleNotification,
    sendImmediateNotification,
    scheduleDailyReminder,
    scheduleStreakReminder,
    scheduleReviewReminder,
    cancelAllNotifications,
  };
}
