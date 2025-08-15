-- Update pathao_settings table to match actual API requirements
ALTER TABLE public.pathao_settings 
DROP COLUMN access_token,
ADD COLUMN client_id TEXT NOT NULL DEFAULT '',
ADD COLUMN client_secret TEXT NOT NULL DEFAULT '',
ADD COLUMN username TEXT NOT NULL DEFAULT '',
ADD COLUMN password TEXT NOT NULL DEFAULT '',
ADD COLUMN access_token TEXT,
ADD COLUMN refresh_token TEXT,
ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;