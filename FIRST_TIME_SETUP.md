# First-Time Setup Guide

This guide will help you set up your application for the first time with a blank database.

## 🚀 Quick Start

### Step 1: Run the Complete Setup Script
1. Go to your Supabase dashboard at `https://supabase.akhiyanbd.com/`
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `complete_setup.sql`
4. Click **Run** to execute the script

### Step 2: Access Your App
1. Go to your app at `http://localhost:8080`
2. The app will automatically detect that no admin users exist
3. You'll see the **First-Time Setup** screen

### Step 3: Create Your Admin Account
1. Fill in your details:
   - **Full Name**: Your full name
   - **Email**: Your email address
   - **Password**: Create a secure password (min 6 characters)
   - **Confirm Password**: Repeat your password
2. Click **"Create Admin Account"**
3. The app will automatically:
   - Create your user account
   - Set up your admin profile
   - Configure admin permissions
   - Sign you in automatically
   - Refresh the page

## ✨ What Happens During Setup

The setup process automatically:

1. **Creates your user account** in Supabase Auth
2. **Creates your profile** with admin role
3. **Sets up admin permissions** in the user_roles table
4. **Configures RLS policies** for security
5. **Signs you in** automatically
6. **Refreshes the app** to complete setup

## 🔒 Admin Privileges

Your new admin account will have:
- **Full access** to all application features
- **User management** capabilities
- **System settings** access
- **Complete control** over the application

## 🛠️ Troubleshooting

### If you get "Table doesn't exist" errors:
- Make sure you ran the `complete_setup.sql` script first
- Check that all tables were created successfully

### If you get permission errors:
- The RLS policies should be set up automatically
- Check that the `user_roles` table has your admin role

### If the setup fails:
- Check the browser console for error messages
- Verify your database connection
- Make sure all required tables exist

## 📋 Required Tables

The setup script creates these essential tables:
- `profiles` - User profile information
- `user_roles` - User role assignments
- `system_settings` - Application configuration

## 🔄 After Setup

Once setup is complete:
- You'll have full admin access
- The app will work normally
- You can start adding products, customers, and sales
- You can manage other users and permissions

## 🎯 Next Steps

After successful setup:
1. **Explore the dashboard** to see your app
2. **Add your first products** to the inventory
3. **Create customer records** for your business
4. **Set up business settings** in the admin panel
5. **Invite team members** if needed

---

**Note**: This setup is designed to run only once. After the first admin user is created, the setup screen will not appear again.
