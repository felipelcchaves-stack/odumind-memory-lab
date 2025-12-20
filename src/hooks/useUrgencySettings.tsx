import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UrgencySettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  spotsTotal: number;
  spotsRemaining: number;
  endDate: string;
  showTimer: boolean;
  showSpots: boolean;
  showSocialProof: boolean;
}

export const useUrgencySettings = () => {
  const [settings, setSettings] = useState<UrgencySettings>({
    enabled: false,
    title: "Últimas {spots} Vagas do Mês",
    subtitle: "Desconto especial de lançamento termina em:",
    spotsTotal: 50,
    spotsRemaining: 50,
    endDate: "",
    showTimer: true,
    showSpots: true,
    showSocialProof: true,
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("category", "urgency");

      if (error) throw error;

      const newSettings: UrgencySettings = {
        enabled: false,
        title: "Últimas {spots} Vagas do Mês",
        subtitle: "Desconto especial de lançamento termina em:",
        spotsTotal: 50,
        spotsRemaining: 50,
        endDate: "",
        showTimer: true,
        showSpots: true,
        showSocialProof: true,
      };

      data?.forEach((s) => {
        switch (s.key) {
          case "urgency_enabled":
            newSettings.enabled = s.value === "true";
            break;
          case "urgency_title":
            newSettings.title = s.value || "Últimas {spots} Vagas do Mês";
            break;
          case "urgency_subtitle":
            newSettings.subtitle = s.value || "Desconto especial de lançamento termina em:";
            break;
          case "urgency_spots_total":
            newSettings.spotsTotal = parseInt(s.value || "50", 10);
            break;
          case "urgency_spots_remaining":
            newSettings.spotsRemaining = parseInt(s.value || "50", 10);
            break;
          case "urgency_end_date":
            newSettings.endDate = s.value || "";
            break;
          case "urgency_show_timer":
            newSettings.showTimer = s.value !== "false";
            break;
          case "urgency_show_spots":
            newSettings.showSpots = s.value !== "false";
            break;
          case "urgency_show_social_proof":
            newSettings.showSocialProof = s.value !== "false";
            break;
        }
      });

      setSettings(newSettings);
    } catch (error) {
      console.error("Error loading urgency settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Calculate time remaining from end date
  const getTimeRemaining = () => {
    if (!settings.endDate) {
      // Default: end of current day
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return endOfDay.getTime() - now.getTime();
    }
    const endDate = new Date(settings.endDate);
    return endDate.getTime() - Date.now();
  };

  return {
    settings,
    loading,
    refresh: loadSettings,
    getTimeRemaining,
  };
};
