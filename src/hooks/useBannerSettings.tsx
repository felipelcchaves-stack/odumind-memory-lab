import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BannerSettings {
  enabled: boolean;
  text: string;
  link: string;
  linkText: string;
  bgColor: string;
  textColor: string;
  startDate: string;
  endDate: string;
  dismissible: boolean;
}

const DISMISSED_KEY = "promo_banner_dismissed";

export const useBannerSettings = () => {
  const [settings, setSettings] = useState<BannerSettings>({
    enabled: false,
    text: "🔥 Black Friday: 50% OFF em todos os planos!",
    link: "/auth",
    linkText: "Aproveitar",
    bgColor: "primary",
    textColor: "primary-foreground",
    startDate: "",
    endDate: "",
    dismissible: true,
  });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("category", "promo_banner");

      if (error) throw error;

      const newSettings: BannerSettings = {
        enabled: false,
        text: "🔥 Black Friday: 50% OFF em todos os planos!",
        link: "/auth",
        linkText: "Aproveitar",
        bgColor: "primary",
        textColor: "primary-foreground",
        startDate: "",
        endDate: "",
        dismissible: true,
      };

      data?.forEach((s) => {
        switch (s.key) {
          case "promo_banner_enabled":
            newSettings.enabled = s.value === "true";
            break;
          case "promo_banner_text":
            newSettings.text = s.value || "🔥 Black Friday: 50% OFF em todos os planos!";
            break;
          case "promo_banner_link":
            newSettings.link = s.value || "/auth";
            break;
          case "promo_banner_link_text":
            newSettings.linkText = s.value || "Aproveitar";
            break;
          case "promo_banner_bg_color":
            newSettings.bgColor = s.value || "primary";
            break;
          case "promo_banner_text_color":
            newSettings.textColor = s.value || "primary-foreground";
            break;
          case "promo_banner_start_date":
            newSettings.startDate = s.value || "";
            break;
          case "promo_banner_end_date":
            newSettings.endDate = s.value || "";
            break;
          case "promo_banner_dismissible":
            newSettings.dismissible = s.value !== "false";
            break;
        }
      });

      setSettings(newSettings);

      // Check if dismissed in current session
      const dismissedValue = sessionStorage.getItem(DISMISSED_KEY);
      setDismissed(dismissedValue === "true");
    } catch (error) {
      console.error("Error loading banner settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Check if banner should be visible based on dates
  const isWithinDateRange = () => {
    const now = new Date();
    
    if (settings.startDate) {
      const start = new Date(settings.startDate);
      if (now < start) return false;
    }
    
    if (settings.endDate) {
      const end = new Date(settings.endDate);
      if (now > end) return false;
    }
    
    return true;
  };

  const shouldShow = settings.enabled && !dismissed && isWithinDateRange();

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  };

  return {
    settings,
    loading,
    shouldShow,
    dismiss,
    refresh: loadSettings,
  };
};
