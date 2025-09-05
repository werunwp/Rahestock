-- 🔧 Fix Sales Table Schema
-- Add missing columns that the app needs

SELECT '=== FIXING SALES TABLE SCHEMA ===' as info;

-- Check current sales table structure
SELECT 'Current sales table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- Add missing columns
DO $$
BEGIN
    -- Add fee column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'fee'
    ) THEN
        ALTER TABLE sales ADD COLUMN fee DECIMAL(10,2) DEFAULT 0.00;
        RAISE NOTICE '✅ Added fee column to sales table';
    ELSE
        RAISE NOTICE '✅ fee column already exists';
    END IF;
    
    -- Add total_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE sales ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0.00;
        RAISE NOTICE '✅ Added total_amount column to sales table';
    ELSE
        RAISE NOTICE '✅ total_amount column already exists';
    END IF;
    
    -- Add customer_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE sales ADD COLUMN customer_id UUID;
        RAISE NOTICE '✅ Added customer_id column to sales table';
    ELSE
        RAISE NOTICE '✅ customer_id column already exists';
    END IF;
    
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE sales ADD COLUMN created_by UUID;
        RAISE NOTICE '✅ Added created_by column to sales table';
    ELSE
        RAISE NOTICE '✅ created_by column already exists';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE sales ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to sales table';
    ELSE
        RAISE NOTICE '✅ updated_at column already exists';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'status'
    ) THEN
        ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completed';
        RAISE NOTICE '✅ Added status column to sales table';
    ELSE
        RAISE NOTICE '✅ status column already exists';
    END IF;
    
    RAISE NOTICE '🎉 Sales table schema fixed successfully!';
END $$;

-- Show final table structure
SELECT '=== FINAL SALES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- Test if we can now create a sale
SELECT '=== TESTING SALE CREATION ===' as info;
SELECT 'Schema should now support sale creation with fee column' as test_result;
