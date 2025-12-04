-- Tornar a coluna edited_by nullable para permitir operações automatizadas
ALTER TABLE public.odu_history ALTER COLUMN edited_by DROP NOT NULL;

-- Recriar a função save_odu_history com tratamento para service role
CREATE OR REPLACE FUNCTION public.save_odu_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Save old version to history
  -- auth.uid() pode ser NULL quando executado por service role (Edge Functions)
  INSERT INTO public.odu_history (
    odu_id, numero, nome, texto_principal, verso, significado, 
    exemplos_praticos, tags, edited_by
  )
  VALUES (
    OLD.id, OLD.numero, OLD.nome, OLD.texto_principal, OLD.verso, 
    OLD.significado, OLD.exemplos_praticos, OLD.tags, auth.uid()
  );
  
  RETURN NEW;
END;
$function$;