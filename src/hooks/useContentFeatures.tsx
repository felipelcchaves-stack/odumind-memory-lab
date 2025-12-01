import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentFeature {
  id: string;
  slug: string;
  nome: string;
  icon: string;
  ativo: boolean;
  count: number;
}

interface ContentFeatures {
  odu: ContentFeature | null;
  rituais: ContentFeature | null;
  rezas: ContentFeature | null;
  invocacoes: ContentFeature | null;
}

export function useContentFeatures() {
  const [features, setFeatures] = useState<ContentFeatures>({
    odu: null,
    rituais: null,
    rezas: null,
    invocacoes: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      // Fetch content types
      const { data: contentTypes, error } = await supabase
        .from('content_types')
        .select('*')
        .order('ordem');

      if (error) throw error;

      // Fetch counts for each content type
      const [oduCount, rituaisCount, rezasCount, invocacoesCount] = await Promise.all([
        supabase.from('odu').select('*', { count: 'exact', head: true }),
        supabase.from('ritual_content').select('*', { count: 'exact', head: true })
          .eq('content_type_id', contentTypes?.find(ct => ct.slug === 'rituais')?.id || ''),
        supabase.from('ritual_content').select('*', { count: 'exact', head: true })
          .eq('content_type_id', contentTypes?.find(ct => ct.slug === 'rezas')?.id || ''),
        supabase.from('ritual_content').select('*', { count: 'exact', head: true })
          .eq('content_type_id', contentTypes?.find(ct => ct.slug === 'invocacoes')?.id || ''),
      ]);

      const featureMap: ContentFeatures = {
        odu: null,
        rituais: null,
        rezas: null,
        invocacoes: null,
      };

      contentTypes?.forEach((ct) => {
        const slug = ct.slug as keyof ContentFeatures;
        let count = 0;
        
        switch (slug) {
          case 'odu':
            count = oduCount.count || 0;
            break;
          case 'rituais':
            count = rituaisCount.count || 0;
            break;
          case 'rezas':
            count = rezasCount.count || 0;
            break;
          case 'invocacoes':
            count = invocacoesCount.count || 0;
            break;
        }

        featureMap[slug] = {
          id: ct.id,
          slug: ct.slug,
          nome: ct.nome,
          icon: ct.icon,
          ativo: ct.ativo ?? true,
          count,
        };
      });

      setFeatures(featureMap);
    } catch (error) {
      console.error('Error loading content features:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (slug: keyof ContentFeatures): boolean => {
    // Odu is always enabled
    if (slug === 'odu') return true;
    return features[slug]?.ativo ?? false;
  };

  const getFeatureCount = (slug: keyof ContentFeatures): number => {
    return features[slug]?.count ?? 0;
  };

  const refetch = () => {
    setLoading(true);
    loadFeatures();
  };

  return {
    features,
    loading,
    isFeatureEnabled,
    getFeatureCount,
    refetch,
  };
}
