-- Inserir configuração de churn rate esperado
INSERT INTO app_settings (key, value, category, description, is_public)
VALUES ('expected_churn_rate', '5', 'financial', 'Churn rate esperado em percentual (ex: 5 para 5%)', false)
ON CONFLICT (key) DO NOTHING;