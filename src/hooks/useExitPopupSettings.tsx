import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ExitPopupSettings {
  enabled: boolean;
  discountPercent: number;
  title: string;
  description: string;
  buttonText: string;
  delaySeconds: number;
}

export const useExitPopupSettings = () => {
  const [settings, setSettings] = useState<ExitPopupSettings>({
    enabled: false,
    discountPercent: 20,
    title: 'Espera! 🎁',
    description: 'Antes de ir, que tal {discount}% de desconto no seu primeiro mês?',
    buttonText: 'Quero Meu Desconto de {discount}%',
    delaySeconds: 3,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-public-settings`);
        if (!response.ok) throw new Error('Failed to fetch settings');
        
        const data = await response.json();
        
        setSettings({
          enabled: data.exit_popup_enabled === 'true',
          discountPercent: parseInt(data.exit_popup_discount_percent) || 20,
          title: data.exit_popup_title || 'Espera! 🎁',
          description: data.exit_popup_description || 'Antes de ir, que tal {discount}% de desconto no seu primeiro mês?',
          buttonText: data.exit_popup_button_text || 'Quero Meu Desconto de {discount}%',
          delaySeconds: parseInt(data.exit_popup_delay_seconds) || 3,
        });
      } catch (error) {
        console.error('Error loading exit popup settings:', error);
        // Mantém valores padrão em caso de erro
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Função auxiliar para substituir placeholder {discount}
  const replaceDiscount = (text: string) => {
    return text.replace(/{discount}/g, String(settings.discountPercent));
  };

  return { 
    settings, 
    loading,
    replaceDiscount,
    formattedTitle: settings.title,
    formattedDescription: settings.description.replace(/{discount}/g, String(settings.discountPercent)),
    formattedButtonText: settings.buttonText.replace(/{discount}/g, String(settings.discountPercent)),
  };
};
