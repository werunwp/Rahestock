# 🚀 Hostinger Deployment Guide

## Overview
This guide will help you deploy your React + Vite inventory management app to Hostinger shared hosting.

## Prerequisites
- ✅ Hostinger account and hosting plan
- ✅ File Manager access or FTP client
- ✅ Your app builds successfully (`npm run build`)

## Step 1: Prepare Your App

### Build the App
```bash
npm run build
```
This creates a `dist/` folder with all your static files.

### Files to Upload
Upload the **entire contents** of the `dist/` folder to your Hostinger public_html directory.

## Step 2: Hostinger Setup

### Option A: Using File Manager (Recommended)
1. **Login to Hostinger Control Panel**
2. **Go to File Manager**
3. **Navigate to public_html**
4. **Upload all files from your `dist/` folder**
5. **Set permissions** (if needed)

### Option B: Using FTP Client
1. **Get FTP credentials** from Hostinger control panel
2. **Connect using FileZilla or similar**
3. **Upload `dist/` contents to public_html**

## Step 3: Configure for React Router

### Create .htaccess file
Create a `.htaccess` file in your public_html directory with:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

This ensures React Router works properly with direct URLs.

## Step 4: Environment Variables

### For Hostinger Shared Hosting
Since shared hosting doesn't support environment variables, you'll need to:

1. **Hardcode your Supabase credentials** in the client.ts file
2. **Or use a config file** approach

### Option 1: Hardcode (Quick)
Edit `src/integrations/supabase/client.ts`:

```typescript
// Replace the environment variables with your actual values
const SUPABASE_URL = "https://supabase.akhiyanbd.com";
const SUPABASE_PUBLISHABLE_KEY = "your_actual_anon_key_here";
```

### Option 2: Config File (Better)
Create a `config.js` file in your `public/` folder:

```javascript
window.APP_CONFIG = {
  SUPABASE_URL: "https://supabase.akhiyanbd.com",
  SUPABASE_ANON_KEY: "your_actual_anon_key_here"
};
```

Then update your client.ts to use:
```typescript
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "https://supabase.akhiyanbd.com";
const SUPABASE_PUBLISHABLE_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";
```

## Step 5: Test Your Deployment

1. **Visit your domain** (e.g., yourdomain.com)
2. **Test all features**:
   - Login/authentication
   - Product management
   - Inventory tracking
   - All CRUD operations

## Step 6: SSL Certificate

Hostinger usually provides free SSL certificates:
1. **Go to SSL section** in control panel
2. **Enable SSL** for your domain
3. **Force HTTPS** (recommended)

## Troubleshooting

### Common Issues:
1. **404 errors on refresh**: Add the .htaccess file
2. **API errors**: Check Supabase CORS settings
3. **Images not loading**: Check file permissions
4. **Slow loading**: Enable gzip compression in .htaccess

### Performance Optimization:
Add to your .htaccess:
```apache
# Enable Gzip Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

## File Structure on Hostinger
```
public_html/
├── index.html
├── .htaccess
├── config.js (if using config approach)
└── assets/
    ├── index-[hash].css
    ├── index-[hash].js
    └── [other assets]
```

## Security Notes
- ✅ Never commit actual API keys to Git
- ✅ Use environment variables in production
- ✅ Enable HTTPS
- ✅ Regular backups

## Support
If you encounter issues:
1. Check Hostinger support documentation
2. Verify file permissions (755 for folders, 644 for files)
3. Check error logs in Hostinger control panel
4. Test with a simple HTML file first

---
**Ready to deploy to Hostinger!** 🎉
