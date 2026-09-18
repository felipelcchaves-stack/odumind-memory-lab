import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

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

  // Inscreve o aparelho pra Web Push de verdade, que o servidor consegue
  // disparar mesmo com o app fechado/em segundo plano - diferente do
  // scheduleNotification acima, que é só um timer local no navegador.
  const subscribeToPush = async (userId: string): Promise<boolean> => {
    if (!supported || !permission.granted) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.error('VITE_VAPID_PUBLIC_KEY não configurada');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: 'endpoint' }
      );

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  };

  const unsubscribeFromPush = async () => {
    if (!supported) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
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
    subscribeToPush,
    unsubscribeFromPush,
    cancelAllNotifications,
  };
}
