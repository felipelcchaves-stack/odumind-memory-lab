import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTechniqueScreenshotsSettings() {
  const [showTechniques, setShowTechniques] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSetting = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "show_technique_screenshots")
          .eq("is_public", true)
          .maybeSingle();

        if (!error && data) {
          setShowTechniques(data.value === "true");
        }
      } catch (error) {
        console.error("Erro ao carregar configuração de técnicas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSetting();
  }, []);

  return { showTechniques, loading };
}
