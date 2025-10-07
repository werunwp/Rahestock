# 🔒 Security Setup Guide

## ⚠️ IMPORTANT: Before Using This Application

This application has been cleaned of sensitive information, but you MUST configure your own infrastructure before use.

## 🚨 Critical Security Steps

### 1. Set Up Your Own Infrastructure

#### Supabase Setup
1. **Create your own Supabase instance** (self-hosted or cloud)
2. **Update all references** to `YOUR_SUPABASE_URL_HERE` with your actual URL
3. **Get your anon key** from your Supabase dashboard
4. **Update all references** to `YOUR_SUPABASE_ANON_KEY_HERE` with your actual key

#### N8N Workflow Setup
1. **Set up your own N8N instance** (self-hosted or cloud)
2. **Update all references** to `YOUR_N8N_URL_HERE` with your actual URL
3. **Create your own courier workflow**
4. **Update webhook URLs** in the application

### 2. Environment Variables

Create a `.env.local` file with:
```env
VITE_SUPABASE_URL=https://your-supabase-url.com
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### 3. Database Security

#### Encryption Key
**CRITICAL**: Change the default encryption key in your Supabase instance:
```sql
-- Set a strong encryption key in your Supabase environment
ALTER DATABASE your_database SET app.encryption_key = 'your_strong_encryption_key_here';
```

#### Row Level Security (RLS)
Ensure RLS policies are properly configured for your use case.

### 4. Deployment Security

#### Before Deployment
- [ ] Replace all `YOUR_SUPABASE_URL_HERE` placeholders
- [ ] Replace all `YOUR_N8N_URL_HERE` placeholders  
- [ ] Update encryption keys
- [ ] Test all integrations
- [ ] Configure CORS settings
- [ ] Set up SSL certificates

#### Production Checklist
- [ ] Strong encryption keys
- [ ] Secure API endpoints
- [ ] Proper CORS configuration
- [ ] SSL/TLS enabled
- [ ] Regular security audits
- [ ] Backup strategy

## 🛡️ Security Best Practices

### 1. API Keys
- Never commit real API keys to version control
- Use environment variables for all sensitive data
- Rotate keys regularly
- Monitor key usage

### 2. Database
- Use strong encryption keys
- Enable RLS policies
- Regular backups
- Monitor access logs

### 3. Infrastructure
- Keep services updated
- Use HTTPS everywhere
- Implement proper firewall rules
- Monitor for unusual activity

## 📞 Support

If you need help setting up your infrastructure:
1. Check the deployment guides in this repository
2. Review Supabase documentation
3. Review N8N documentation
4. Test all integrations before going live

## ⚠️ Disclaimer

This application is provided as-is. Ensure you understand all security implications before deploying to production.
