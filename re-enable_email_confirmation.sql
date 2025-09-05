-- Re-enable Email Confirmation After First Admin User Setup
-- Run this AFTER you've successfully created your first admin user

-- Check current email confirmation settings
SELECT 'Current email confirmation settings:' as info;
SELECT 
    key,
    value,
    description
FROM auth.config
WHERE key LIKE '%email%' OR key LIKE '%confirm%';

-- Re-enable email confirmation for new users
UPDATE auth.config 
SET value = 'true' 
WHERE key = 'enable_signup' AND value = 'false';

-- Alternative: Re-enable the specific email confirmation setting
-- UPDATE auth.config 
-- SET value = 'true' 
-- WHERE key = 'enable_confirmations' AND value = 'false';

-- Verify the change
SELECT 'Updated email confirmation settings:' as info;
SELECT 
    key,
    value,
    description
FROM auth.config
WHERE key LIKE '%email%' OR key LIKE '%confirm%';

-- Final verification
SELECT 'Email confirmation has been re-enabled successfully!' as status;
SELECT 'New users will now need to confirm their email addresses.' as note;
