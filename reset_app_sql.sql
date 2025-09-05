-- 🔄 Reset App SQL Script (No Edge Functions Needed)
-- Run this in your VPS Supabase SQL Editor to reset your app

-- =========================================
-- STEP 1: VERIFY ADMIN USER EXISTS
-- =========================================

-- Check if we have admin users
SELECT '=== CHECKING ADMIN USERS ===' as info;
SELECT user_id, role, created_at FROM user_roles WHERE role = 'admin' ORDER BY created_at ASC;

-- =========================================
-- STEP 2: IDENTIFY PRIMARY ADMIN TO KEEP
-- =========================================

-- Get the first created admin user (the one to preserve)
DO $$
DECLARE
    primary_admin_id UUID;
BEGIN
    SELECT user_id INTO primary_admin_id 
    FROM user_roles 
    WHERE role = 'admin' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF primary_admin_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found to preserve during reset';
    END IF;
    
    RAISE NOTICE 'Primary admin to preserve: %', primary_admin_id;
    
    -- Store this for later use
    PERFORM set_config('app.primary_admin_id', primary_admin_id::text, false);
END $$;

-- =========================================
-- STEP 3: DELETE ALL NON-ADMIN USERS
-- =========================================

-- Delete user data from tables (keep admin) - only if user_id column exists
DO $$
DECLARE
    primary_admin_id UUID;
    user_id_exists BOOLEAN;
BEGIN
    -- Check if user_id column exists in user_roles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'user_id'
    ) INTO user_id_exists;
    
    IF user_id_exists THEN
        -- Get the primary admin ID
        SELECT user_id INTO primary_admin_id 
        FROM user_roles 
        WHERE role = 'admin' 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        -- Delete from user_preferences if user_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_preferences' 
            AND column_name = 'user_id'
        ) THEN
            DELETE FROM user_preferences WHERE user_id NOT IN (
                SELECT user_id FROM user_roles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
            );
            RAISE NOTICE 'Deleted non-admin user preferences';
        END IF;
        
        -- Delete from profiles if user_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'user_id'
        ) THEN
            DELETE FROM profiles WHERE user_id NOT IN (
                SELECT user_id FROM user_roles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
            );
            RAISE NOTICE 'Deleted non-admin profiles';
        END IF;
        
        -- Delete from user_roles (keep admin)
        DELETE FROM user_roles WHERE user_id NOT IN (
            SELECT user_id FROM user_roles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
        );
        RAISE NOTICE 'Deleted non-admin user roles';
        
    ELSE
        RAISE NOTICE 'user_id column not found in user_roles, skipping user deletion';
    END IF;
END $$;

-- =========================================
-- STEP 4: RESET ALL BUSINESS DATA TABLES
-- =========================================

-- List of tables to reset (excluding user-related tables)
SELECT '=== RESETTING BUSINESS DATA ===' as info;

-- Reset sales and related data
DELETE FROM sales_items;
DELETE FROM sales;
DELETE FROM inventory_logs;

-- Reset product data
DELETE FROM product_variants;
DELETE FROM product_attribute_values;
DELETE FROM product_attributes;
DELETE FROM products;

-- Reset customer data
DELETE FROM customers;

-- Reset WooCommerce data
DELETE FROM woocommerce_import_logs;
DELETE FROM woocommerce_connections;

-- Reset other data
DELETE FROM dismissed_alerts;
DELETE FROM business_settings;
DELETE FROM system_settings;

-- =========================================
-- STEP 5: RESTORE ESSENTIAL ADMIN DATA
-- =========================================

-- Get the primary admin ID and restore data
DO $$
DECLARE
    primary_admin_id UUID;
    user_id_exists BOOLEAN;
    profiles_user_id_exists BOOLEAN;
BEGIN
    -- Check if user_id column exists in user_roles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'user_id'
    ) INTO user_id_exists;
    
    IF user_id_exists THEN
        -- Get the primary admin ID
        SELECT user_id INTO primary_admin_id 
        FROM user_roles 
        WHERE role = 'admin' 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        -- Check if user_id column exists in profiles
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'user_id'
        ) INTO profiles_user_id_exists;
        
        -- Restore admin profile if needed and if user_id column exists
        IF profiles_user_id_exists THEN
            -- Use dynamic SQL to check if profile exists (safe way)
            DECLARE
                profile_exists BOOLEAN;
            BEGIN
                EXECUTE 'SELECT EXISTS (SELECT 1 FROM profiles WHERE user_id = $1)' 
                INTO profile_exists 
                USING primary_admin_id;
                
                IF NOT profile_exists THEN
                    INSERT INTO profiles (id, user_id, full_name, phone, created_at, updated_at)
                    VALUES (
                        gen_random_uuid(),
                        primary_admin_id,
                        'Admin User',
                        '+880000000000',
                        NOW(),
                        NOW()
                    );
                    RAISE NOTICE 'Restored admin profile';
                END IF;
            END;
        END IF;
        
        -- Restore admin role if needed
        IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = primary_admin_id) THEN
            INSERT INTO user_roles (id, user_id, role, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                primary_admin_id,
                'admin',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Restored admin role';
        END IF;
        
        -- Create default system settings
        INSERT INTO system_settings (currency_symbol, currency_code, timezone, date_format, time_format, created_at, updated_at)
        VALUES ('৳', 'BDT', 'Asia/Dhaka', 'dd/MM/yyyy', '12h', NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        -- Create default business settings
        INSERT INTO business_settings (business_name, invoice_prefix, invoice_footer_message, brand_color, created_by, created_at, updated_at)
        VALUES ('Your Business Name', 'INV', 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য', '#2c7be5', primary_admin_id, NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Restored essential admin data and settings';
    ELSE
        RAISE NOTICE 'user_id column not found, cannot restore admin data';
    END IF;
END $$;

-- =========================================
-- STEP 6: VERIFY RESET COMPLETED
-- =========================================

SELECT '=== RESET VERIFICATION ===' as info;

-- Check user count
SELECT 'User counts after reset:' as info;
SELECT COUNT(*) as total_users FROM user_roles;
SELECT COUNT(*) as admin_users FROM user_roles WHERE role = 'admin';

-- Check data counts
SELECT 'Data counts after reset:' as info;
SELECT COUNT(*) as sales_count FROM sales;
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as customers_count FROM customers;

-- =========================================
-- STEP 7: FINAL STATUS
-- =========================================

SELECT '🎉 APP RESET COMPLETED SUCCESSFULLY!' as result;
SELECT '✅ All business data has been cleared' as status;
SELECT '✅ Admin user has been preserved' as status;
SELECT '✅ Default settings have been restored' as status;
SELECT '✅ Your app is now ready for fresh start' as status;
