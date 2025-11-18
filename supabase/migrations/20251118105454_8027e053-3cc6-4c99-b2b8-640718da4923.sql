-- Adicionar coluna verso_resumido à tabela odu
ALTER TABLE odu ADD COLUMN verso_resumido TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN odu.verso_resumido IS 'Verso curto e memorável para uso em quizzes e memorização rápida (máx 150 caracteres)';

-- Desabilitar temporariamente o trigger de histórico para popular dados iniciais
ALTER TABLE odu DISABLE TRIGGER save_odu_history_trigger;

-- Popular verso_resumido com alguns valores iniciais dos Odus que já têm versos curtos
UPDATE odu SET verso_resumido = verso 
WHERE verso IS NOT NULL 
  AND LENGTH(verso) <= 150;

-- Reabilitar o trigger de histórico
ALTER TABLE odu ENABLE TRIGGER save_odu_history_trigger;