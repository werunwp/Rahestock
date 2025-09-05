-- 🔍 Check Sales Table Schema
-- Run this to see what columns exist in the sales table

SELECT '=== SALES TABLE SCHEMA ===' as info;

-- Check if sales table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') 
        THEN '✅ Sales table exists' 
        ELSE '❌ Sales table does not exist' 
    END as table_status;

-- If table exists, show its structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
        RAISE NOTICE 'Sales table columns:';
        FOR col_info IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'sales' 
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE 'Column: %, Type: %, Nullable: %, Default: %', 
                col_info.column_name, 
                col_info.data_type, 
                col_info.is_nullable, 
                col_info.column_default;
        END LOOP;
    END IF;
END $$;

-- Check for specific columns the app might need
SELECT '=== CHECKING REQUIRED COLUMNS ===' as info;

DO $$
BEGIN
    -- Check for fee column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'fee'
    ) THEN
        RAISE NOTICE '✅ fee column exists in sales table';
    ELSE
        RAISE NOTICE '❌ fee column MISSING from sales table';
    END IF;
    
    -- Check for other common columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'total_amount'
    ) THEN
        RAISE NOTICE '✅ total_amount column exists in sales table';
    ELSE
        RAISE NOTICE '❌ total_amount column MISSING from sales table';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'customer_id'
    ) THEN
        RAISE NOTICE '✅ customer_id column exists in sales table';
    ELSE
        RAISE NOTICE '❌ customer_id column MISSING from sales table';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'created_by'
    ) THEN
        RAISE NOTICE '✅ created_by column exists in sales table';
    ELSE
        RAISE NOTICE '❌ created_by column MISSING from sales table';
    END IF;
END $$;
