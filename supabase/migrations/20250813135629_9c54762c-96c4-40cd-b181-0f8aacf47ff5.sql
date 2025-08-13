-- Add missing sales.view permission to all existing role permissions
INSERT INTO role_permissions (role, permission_key, allowed) 
SELECT role, 'sales.view', allowed 
FROM role_permissions 
WHERE permission_key = 'sales.create'
ON CONFLICT (role, permission_key) DO NOTHING;

-- Ensure manager role has sales.view permission enabled  
INSERT INTO role_permissions (role, permission_key, allowed) 
VALUES ('manager', 'sales.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET allowed = true;