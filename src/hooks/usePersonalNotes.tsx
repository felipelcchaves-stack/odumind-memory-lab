import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Hook de debounce customizado
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface PersonalNote {
  id: string;
  user_id: string;
  odu_id: string;
  conteudo: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePersonalNotesReturn {
  note: string | null;
  loading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  saveNote: (content: string) => Promise<void>;
  deleteNote: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePersonalNotes(oduId: string): UsePersonalNotesReturn {
  const { user } = useAuth();
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  // Debounce do conteúdo para auto-save
  const debouncedContent = useDebounce(pendingContent, 3000);

  // Fetch inicial
  const fetchNote = useCallback(async () => {
    if (!user || !oduId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("personal_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("odu_id", oduId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setNote(data?.conteudo || null);
      if (data?.updated_at) {
        setLastSaved(new Date(data.updated_at));
      }
    } catch (err) {
      console.error("Error fetching personal note:", err);
      setError("Erro ao carregar nota");
      toast.error("Erro ao carregar sua nota pessoal");
    } finally {
      setLoading(false);
    }
  }, [user, oduId]);

  // Salvar nota (upsert)
  const saveNote = useCallback(
    async (content: string) => {
      if (!user || !oduId) return;

      try {
        setIsSaving(true);
        setError(null);

        const { error: upsertError } = await supabase
          .from("personal_notes")
          .upsert(
            {
              user_id: user.id,
              odu_id: oduId,
              conteudo: content || null,
            },
            {
              onConflict: "user_id,odu_id",
            }
          );

        if (upsertError) throw upsertError;

        setNote(content);
        setLastSaved(new Date());
      } catch (err) {
        console.error("Error saving personal note:", err);
        setError("Erro ao salvar nota");
        toast.error("Erro ao salvar sua nota");
      } finally {
        setIsSaving(false);
      }
    },
    [user, oduId]
  );

  // Deletar nota
  const deleteNote = useCallback(async () => {
    if (!user || !oduId) return;

    try {
      setIsSaving(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from("personal_notes")
        .delete()
        .eq("user_id", user.id)
        .eq("odu_id", oduId);

      if (deleteError) throw deleteError;

      setNote(null);
      setLastSaved(null);
      toast.success("Nota excluída com sucesso");
    } catch (err) {
      console.error("Error deleting personal note:", err);
      setError("Erro ao excluir nota");
      toast.error("Erro ao excluir sua nota");
    } finally {
      setIsSaving(false);
    }
  }, [user, oduId]);

  // Auto-save quando debounced content mudar
  useEffect(() => {
    if (debouncedContent !== null && debouncedContent !== note) {
      saveNote(debouncedContent);
    }
  }, [debouncedContent, note, saveNote]);

  // Fetch inicial
  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  return {
    note,
    loading,
    isSaving,
    lastSaved,
    error,
    saveNote: async (content: string) => {
      setPendingContent(content);
    },
    deleteNote,
    refresh: fetchNote,
  };
}
