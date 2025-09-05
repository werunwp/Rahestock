# 🚀 Migration Guide: Hosted Supabase → Self-Hosted Supabase

## 📋 Prerequisites
- Self-hosted Supabase instance running
- Access to your hosted Supabase dashboard
- Supabase CLI installed locally

## 🔄 Step 1: Export Data from Hosted Supabase

### 1.1 Export Database Schema
```bash
# Get your hosted Supabase database URL and key
# Go to: https://fbpzvcixoocdtzqvtwfr.supabase.co/project/default/settings/database

# Export schema using pg_dump
pg_dump "postgresql://postgres:[YOUR_PASSWORD]@db.fbpzvcixoocdtzqvtwfr.supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  > hosted_schema.sql
```

### 1.2 Export Data
```bash
# Export all data
pg_dump "postgresql://postgres:[YOUR_PASSWORD]@db.fbpzvcixoocdtzqvtwfr.supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  > hosted_data.sql
```

### 1.3 Export Storage Files
```bash
# Download all files from your storage buckets
# Go to Storage in your hosted Supabase dashboard
# Download all files manually or use the API
```

## 🏗️ Step 2: Setup Self-Hosted Supabase

### 2.1 Start Local Supabase
```bash
cd rahedeen-wholesale-sync/supabase
npx supabase start
```

### 2.2 Get Self-Hosted Connection Details
```bash
npx supabase status
# Note down the local URLs and keys
```

## 🔧 Step 3: Import Schema and Data

### 3.1 Import Schema
```bash
# Connect to your self-hosted database
psql "postgresql://postgres:postgres@localhost:54322/postgres" < hosted_schema.sql
```

### 3.2 Import Data
```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" < hosted_data.sql
```

### 3.3 Add Missing Charge Column
```sql
-- Run this in your self-hosted Supabase SQL Editor
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS charge numeric DEFAULT 0;

UPDATE public.sales 
SET charge = 0 
WHERE charge IS NULL;

ALTER TABLE public.sales 
ALTER COLUMN charge SET NOT NULL,
ALTER COLUMN charge SET DEFAULT 0;
```

## ⚙️ Step 4: Update Application Configuration

### 4.1 Create Environment File
```bash
# Create .env.local file
touch .env.local
```

### 4.2 Add Environment Variables
```env
# .env.local
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### 4.3 Update Supabase Client
```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "your_local_key";
```

## 🗄️ Step 5: Migrate Storage Files

### 5.1 Upload Files to Self-Hosted
```bash
# Use Supabase CLI to upload files
npx supabase storage cp --from-bucket [BUCKET_NAME] --to-bucket [BUCKET_NAME] --recursive
```

### 5.2 Update Storage Policies
```sql
-- Ensure storage policies are set correctly
-- Run in self-hosted SQL Editor
```

## 🧪 Step 6: Test Migration

### 6.1 Start Application
```bash
npm run dev
```

### 6.2 Verify Data
- Check if all tables have data
- Verify file uploads work
- Test authentication
- Test CRUD operations

## 🔐 Step 7: Update Authentication

### 7.1 Update Auth Settings
```bash
# Copy auth settings from hosted to self-hosted
# Go to Authentication > Settings in both dashboards
# Copy over:
# - Site URL
# - Redirect URLs
# - Email templates
# - OAuth providers
```

### 7.2 Update User Passwords
```sql
-- Users will need to reset passwords or you can set them manually
-- This is a security requirement
```

## 🚀 Step 8: Production Deployment

### 8.1 Deploy Self-Hosted Supabase
```bash
# Follow your self-hosting provider's instructions
# Examples: Docker, Kubernetes, VPS, etc.
```

### 8.2 Update Production Environment
```env
# Production .env
VITE_SUPABASE_URL=https://your-self-hosted-domain.com
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

### 8.3 Update DNS and Domains
- Point your domain to self-hosted instance
- Update SSL certificates
- Configure reverse proxy if needed

## ⚠️ Important Notes

1. **Backup Everything**: Always backup before migration
2. **Test Thoroughly**: Test in staging before production
3. **Downtime Planning**: Plan for minimal downtime
4. **Rollback Plan**: Have a rollback strategy ready
5. **Monitor Performance**: Watch for performance differences

## 🔍 Troubleshooting

### Common Issues:
- **Connection Errors**: Check firewall and network settings
- **Data Missing**: Verify import commands completed successfully
- **Authentication Issues**: Check auth settings and policies
- **Storage Problems**: Verify bucket policies and file permissions

### Useful Commands:
```bash
# Check Supabase status
npx supabase status

# View logs
npx supabase logs

# Reset local database
npx supabase db reset

# Check database connection
psql "postgresql://postgres:postgres@localhost:54322/postgres"
```

## 📞 Support

If you encounter issues during migration:
1. Check Supabase logs: `npx supabase logs`
2. Verify database connection
3. Check migration files for errors
4. Review environment variables
5. Ensure all services are running

---

**Migration completed successfully! 🎉**
Your app is now running on self-hosted Supabase with all your data intact.

