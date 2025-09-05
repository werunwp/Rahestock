-- Ensure WooCommerce tables exist
-- This script creates the necessary tables for WooCommerce integration

-- Create woocommerce_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS woocommerce_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_name TEXT NOT NULL,
    site_url TEXT NOT NULL,
    consumer_key TEXT NOT NULL,
    consumer_secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_import_at TIMESTAMPTZ,
    total_products_imported INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create woocommerce_import_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS woocommerce_import_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES woocommerce_connections(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    total_products INTEGER DEFAULT 0,
    imported_products INTEGER DEFAULT 0,
    failed_products INTEGER DEFAULT 0,
    current_page INTEGER,
    total_pages INTEGER,
    error_message TEXT,
    progress_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_woocommerce_connections_user_id ON woocommerce_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_connections_site_url ON woocommerce_connections(site_url);
CREATE INDEX IF NOT EXISTS idx_woocommerce_import_logs_connection_id ON woocommerce_import_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_woocommerce_import_logs_status ON woocommerce_import_logs(status);

-- Enable Row Level Security
ALTER TABLE woocommerce_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE woocommerce_import_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for woocommerce_connections
DROP POLICY IF EXISTS "Users can view their own WooCommerce connections" ON woocommerce_connections;
CREATE POLICY "Users can view their own WooCommerce connections" ON woocommerce_connections
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own WooCommerce connections" ON woocommerce_connections;
CREATE POLICY "Users can insert their own WooCommerce connections" ON woocommerce_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own WooCommerce connections" ON woocommerce_connections;
CREATE POLICY "Users can update their own WooCommerce connections" ON woocommerce_connections
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own WooCommerce connections" ON woocommerce_connections;
CREATE POLICY "Users can delete their own WooCommerce connections" ON woocommerce_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for woocommerce_import_logs
DROP POLICY IF EXISTS "Users can view import logs for their connections" ON woocommerce_import_logs;
CREATE POLICY "Users can view import logs for their connections" ON woocommerce_import_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM woocommerce_connections 
            WHERE woocommerce_connections.id = woocommerce_import_logs.connection_id 
            AND woocommerce_connections.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert import logs for their connections" ON woocommerce_import_logs;
CREATE POLICY "Users can insert import logs for their connections" ON woocommerce_import_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM woocommerce_connections 
            WHERE woocommerce_connections.id = woocommerce_import_logs.connection_id 
            AND woocommerce_connections.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update import logs for their connections" ON woocommerce_import_logs;
CREATE POLICY "Users can update import logs for their connections" ON woocommerce_import_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM woocommerce_connections 
            WHERE woocommerce_connections.id = woocommerce_import_logs.connection_id 
            AND woocommerce_connections.user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_woocommerce_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_woocommerce_connections_updated_at ON woocommerce_connections;
CREATE TRIGGER trigger_update_woocommerce_connections_updated_at
    BEFORE UPDATE ON woocommerce_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_woocommerce_connections_updated_at();

-- Grant necessary permissions
GRANT ALL ON woocommerce_connections TO authenticated;
GRANT ALL ON woocommerce_import_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

