-- Update pathao settings to use production URL instead of sandbox
UPDATE pathao_settings 
SET api_base_url = 'https://api-hermes.pathao.com', 
    updated_at = now()
WHERE api_base_url = 'https://courier-api-sandbox.pathao.com';