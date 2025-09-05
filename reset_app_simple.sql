-- 🔄 Simple App Reset Script (No Column Errors)
-- Run this in your VPS Supabase SQL Editor to reset your app

-- =========================================
-- STEP 1: CHECK CURRENT STATE
-- =========================================

SELECT '=== CHECKING CURRENT STATE ===' as info;

-- Check what tables exist
SELECT 'Available tables:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =========================================
-- STEP 2: RESET BUSINESS DATA (SAFE)
-- =========================================

SELECT '=== RESETTING BUSINESS DATA ===' as info;

-- Reset sales and related data (only if tables exist)
DO $$
BEGIN
    -- Sales items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_items') THEN
        DELETE FROM sales_items;
        RAISE NOTICE 'Cleared sales_items table';
    END IF;
    
    -- Sales
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
        DELETE FROM sales;
        RAISE NOTICE 'Cleared sales table';
    END IF;
    
    -- Inventory logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_logs') THEN
        DELETE FROM inventory_logs;
        RAISE NOTICE 'Cleared inventory_logs table';
    END IF;
    
    -- Product variants
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_variants') THEN
        DELETE FROM product_variants;
        RAISE NOTICE 'Cleared product_variants table';
    END IF;
    
    -- Product attribute values
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_attribute_values') THEN
        DELETE FROM product_attribute_values;
        RAISE NOTICE 'Cleared product_attribute_values table';
    END IF;
    
    -- Product attributes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_attributes') THEN
        DELETE FROM product_attributes;
        RAISE NOTICE 'Cleared product_attributes table';
    END IF;
    
    -- Products
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        DELETE FROM products;
        RAISE NOTICE 'Cleared products table';
    END IF;
    
    -- Customers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        DELETE FROM customers;
        RAISE NOTICE 'Cleared customers table';
    END IF;
    
    -- WooCommerce import logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'woocommerce_import_logs') THEN
        DELETE FROM woocommerce_import_logs;
        RAISE NOTICE 'Cleared woocommerce_import_logs table';
    END IF;
    
    -- WooCommerce connections
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'woocommerce_connections') THEN
        DELETE FROM woocommerce_connections;
        RAISE NOTICE 'Cleared woocommerce_connections table';
    END IF;
    
    -- Dismissed alerts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dismissed_alerts') THEN
        DELETE FROM dismissed_alerts;
        RAISE NOTICE 'Cleared dismissed_alerts table';
    END IF;
    
    -- Business settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_settings') THEN
        DELETE FROM business_settings;
        RAISE NOTICE 'Cleared business_settings table';
    END IF;
    
    -- System settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        DELETE FROM system_settings;
        RAISE NOTICE 'Cleared system_settings table';
    END IF;
    
    RAISE NOTICE '✅ All business data cleared successfully!';
END $$;

-- =========================================
-- STEP 3: CREATE DEFAULT SETTINGS
-- =========================================

SELECT '=== CREATING DEFAULT SETTINGS ===' as info;

-- Create default system settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        INSERT INTO system_settings (currency_symbol, currency_code, timezone, date_format, time_format, created_at, updated_at)
        VALUES ('৳', 'BDT', 'Asia/Dhaka', 'dd/MM/yyyy', '12h', NOW(), NOW())
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created default system settings';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_settings') THEN
        INSERT INTO business_settings (business_name, invoice_prefix, invoice_footer_message, brand_color, created_at, updated_at)
        VALUES ('Your Business Name', 'INV', 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য', '#2c7be5', NOW(), NOW())
        ON CONFLICT DO NOTHING;
        RAISE NOTICE 'Created default business settings';
    END IF;
END $$;

-- =========================================
-- STEP 4: VERIFY RESET COMPLETED
-- =========================================

SELECT '=== RESET VERIFICATION ===' as info;

-- Check data counts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
        RAISE NOTICE 'Sales count after reset: %', (SELECT COUNT(*) FROM sales);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE 'Products count after reset: %', (SELECT COUNT(*) FROM products);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        RAISE NOTICE 'Customers count after reset: %', (SELECT COUNT(*) FROM customers);
    END IF;
END $$;

-- =========================================
-- STEP 5: FINAL STATUS
-- =========================================

SELECT '🎉 APP RESET COMPLETED SUCCESSFULLY!' as result;
SELECT '✅ All business data has been cleared' as status;
SELECT '✅ Default settings have been restored' as status;
SELECT '✅ Your app is now ready for fresh start' as status;
SELECT '✅ No column errors occurred' as status;
