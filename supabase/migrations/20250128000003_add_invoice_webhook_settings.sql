-- Add invoice webhook settings to system_settings table
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS invoice_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_webhook_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invoice_webhook_auth_token TEXT,
ADD COLUMN IF NOT EXISTS invoice_webhook_timeout INTEGER DEFAULT 30;

-- Add comments for documentation
COMMENT ON COLUMN system_settings.invoice_webhook_url IS 'External API URL for sending invoice data';
COMMENT ON COLUMN system_settings.invoice_webhook_enabled IS 'Whether to send invoice data to external webhook';
COMMENT ON COLUMN system_settings.invoice_webhook_auth_token IS 'Authentication token for webhook requests';
COMMENT ON COLUMN system_settings.invoice_webhook_timeout IS 'Timeout in seconds for webhook requests (5-120)';

