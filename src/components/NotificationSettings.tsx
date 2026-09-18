import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Clock, Flame, BookOpen, Save } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NotificationSettingsData {
  enabled: boolean;
  dailyReminderTime: string;
  streakReminders: boolean;
  reviewReminders: boolean;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const { supported, permission, requestPermission, scheduleDailyReminder, subscribeToPush, unsubscribeFromPush } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettingsData>({
    enabled: false,
    dailyReminderTime: '20:00',
    streakReminders: true,
    reviewReminders: true,
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Check if notifications are enabled
    if (permission.granted) {
      setSettings((prev) => ({ ...prev, enabled: true }));
    }
  }, [permission]);

  const handleEnableNotifications = async () => {
    if (!supported) {
      toast.error('Notificações não são suportadas neste navegador');
      return;
    }

    if (!permission.granted) {
      const granted = await requestPermission();
      if (granted && user) {
        const subscribed = await subscribeToPush(user.id);
        if (!subscribed) {
          toast.error('Não foi possível ativar o lembrete diário neste aparelho.');
        }
        setSettings((prev) => ({ ...prev, enabled: true }));
        saveSettings({ ...settings, enabled: true });
      }
    } else {
      await unsubscribeFromPush();
      setSettings((prev) => ({ ...prev, enabled: false }));
      saveSettings({ ...settings, enabled: false });
      toast.info('Notificações desativadas');
    }
  };

  const saveSettings = (newSettings: NotificationSettingsData) => {
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    
    // Schedule daily reminder if enabled
    if (newSettings.enabled && newSettings.dailyReminderTime) {
      const [hours, minutes] = newSettings.dailyReminderTime.split(':').map(Number);
      scheduleDailyReminder(hours, minutes);
    }
    
    toast.success('Configurações salvas com sucesso!');
  };

  const handleSave = () => {
    saveSettings(settings);
  };

  const handleSettingChange = (key: keyof NotificationSettingsData, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configurações de Notificações
        </CardTitle>
        <CardDescription>
          Gerencie como e quando você quer ser lembrado de estudar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enable-notifications" className="text-base">
              Ativar Notificações
            </Label>
            <p className="text-sm text-muted-foreground">
              {permission.granted
                ? 'Notificações estão ativas'
                : 'Permitir notificações push'}
            </p>
          </div>
          <Switch
            id="enable-notifications"
            checked={settings.enabled}
            onCheckedChange={handleEnableNotifications}
            disabled={!supported}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Daily Reminder Time */}
            <div className="space-y-2">
              <Label htmlFor="daily-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário do Lembrete Diário
              </Label>
              <Input
                id="daily-time"
                type="time"
                value={settings.dailyReminderTime}
                onChange={(e) => handleSettingChange('dailyReminderTime', e.target.value)}
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Receba um lembrete todos os dias neste horário
              </p>
            </div>

            {/* Streak Reminders */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="streak-reminders" className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Lembretes de Streak
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas para não perder seu streak
                </p>
              </div>
              <Switch
                id="streak-reminders"
                checked={settings.streakReminders}
                onCheckedChange={(checked) => handleSettingChange('streakReminders', checked)}
              />
            </div>

            {/* Review Reminders */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="review-reminders" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Lembretes de Revisão
                </Label>
                <p className="text-sm text-muted-foreground">
                  Seja notificado quando tiver revisões pendentes
                </p>
              </div>
              <Switch
                id="review-reminders"
                checked={settings.reviewReminders}
                onCheckedChange={(checked) => handleSettingChange('reviewReminders', checked)}
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </>
        )}

        {!supported && (
          <p className="text-sm text-muted-foreground text-center p-4 bg-muted rounded-lg">
            Notificações não são suportadas neste navegador. Use um navegador moderno como Chrome,
            Firefox ou Safari.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
