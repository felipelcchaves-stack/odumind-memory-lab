-- Migration: Recalcular status de memorização com nova lógica
-- Atualiza status baseado em revisões >= 3 e força >= 60

UPDATE memorizacao 
SET status = CASE
  WHEN revisoes >= 3 AND forca_memoria >= 60 THEN 'memorizado'::status_memorizacao
  WHEN revisoes >= 1 THEN 'estudando'::status_memorizacao
  ELSE 'nao_estudado'::status_memorizacao
END
WHERE status != 'memorizado' OR (revisoes >= 3 AND forca_memoria >= 60);