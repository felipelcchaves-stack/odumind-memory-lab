import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PromoSettings {
  enabled: boolean;
  name: string;
  durationDays: number;
  planMapping: string;
  checkoutUrl: string;
}

export const usePromoSettings = () => {
  const [settings, setSettings] = useState<PromoSettings>({
    enabled: false,
    name: "Lançamento Especial",
    durationDays: 90,
    planMapping: "Awo",
    checkoutUrl: "",
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("category", "promo");

      if (error) throw error;

      const newSettings: PromoSettings = {
        enabled: false,
        name: "Lançamento Especial",
        durationDays: 90,
        planMapping: "Awo",
        checkoutUrl: "",
      };

      data?.forEach((s) => {
        switch (s.key) {
          case "promo_enabled":
            newSettings.enabled = s.value === "true";
            break;
          case "promo_name":
            newSettings.name = s.value || "Lançamento Especial";
            break;
          case "promo_duration_days":
            newSettings.durationDays = parseInt(s.value || "90", 10);
            break;
          case "promo_plan_mapping":
            newSettings.planMapping = s.value || "Awo";
            break;
          case "promo_checkout_url":
            newSettings.checkoutUrl = s.value || "";
            break;
        }
      });

      setSettings(newSettings);
    } catch (error) {
      console.error("Error loading promo settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    refresh: loadSettings,
  };
};
