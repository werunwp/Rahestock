-- Disable Email Confirmation for First Admin User Setup
-- Run this BEFORE running the robust_setup.sql script

-- Check current email confirmation settings
SELECT 'Current email confirmation settings:' as info;
SELECT 
    key,
    value,
    description
FROM auth.config
WHERE key LIKE '%email%' OR key LIKE '%confirm%';

-- Temporarily disable email confirmation for new users
-- This allows the first admin user to be created without email confirmation
UPDATE auth.config 
SET value = 'false' 
WHERE key = 'enable_signup' AND value = 'true';

-- Alternative: Update the specific email confirmation setting
-- UPDATE auth.config 
-- SET value = 'false' 
-- WHERE key = 'enable_confirmations' AND value = 'true';

-- Verify the change
SELECT 'Updated email confirmation settings:' as info;
SELECT 
    key,
    value,
    description
FROM auth.config
WHERE key LIKE '%email%' OR key LIKE '%confirm%';

-- Note: After creating your admin user, you can re-enable email confirmation
-- by running the re-enable_email_confirmation.sql script
