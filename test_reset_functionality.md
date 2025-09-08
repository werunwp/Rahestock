# Reset Functionality Test Guide

## ✅ Enhanced Reset Function Features

### **What the Reset Function Now Does:**

#### **1. Complete Data Cleanup:**
- ✅ **Database Tables**: Deletes all business data (products, customers, sales, etc.)
- ✅ **Storage Files**: Removes all uploaded images from `product-images` bucket
- ✅ **User Data**: Removes all users except the primary admin
- ✅ **System Data**: Resets business and system settings to defaults

#### **2. Admin Preservation:**
- ✅ **Admin User**: Keeps the primary admin user account
- ✅ **Admin Profile**: Ensures admin profile exists with proper data
- ✅ **Admin Role**: Maintains admin role and permissions
- ✅ **Access**: Admin can still log in and access the app

#### **3. App Stability:**
- ✅ **Default Settings**: Restores essential business and system settings
- ✅ **Database Integrity**: Maintains proper database structure
- ✅ **Error Handling**: Continues even if some operations fail
- ✅ **Backup**: Creates backup before reset

## 🧪 Testing Steps

### **Before Reset:**
1. **Upload Test Images**: Add some product images
2. **Create Test Data**: Add products, customers, sales
3. **Verify Admin Access**: Ensure admin can log in

### **During Reset:**
1. **Run Reset**: Execute the reset function
2. **Monitor Progress**: Check console logs for progress
3. **Verify Cleanup**: Confirm storage and database cleanup

### **After Reset:**
1. **Admin Login**: Verify admin can still log in
2. **App Functionality**: Check if app loads without errors
3. **Storage Check**: Verify images are removed from storage
4. **Database Check**: Confirm data is reset but structure remains
5. **Settings Check**: Verify default settings are restored

## 🔍 Verification Commands

### **Check Storage Cleanup:**
```sql
-- This should return empty or only system files
SELECT * FROM storage.objects WHERE bucket_id = 'product-images';
```

### **Check Database Reset:**
```sql
-- These should return 0 or minimal records
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM sales;
```

### **Check Admin Preservation:**
```sql
-- This should return 1 admin user
SELECT COUNT(*) FROM user_roles WHERE role = 'admin';
SELECT * FROM profiles WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'admin'
);
```

## 🚨 Expected Results

### **✅ Success Indicators:**
- Admin can log in after reset
- App loads without errors
- Storage bucket is empty
- Database has only essential records
- Default settings are restored
- **Attributes page is completely blank** (no reusable attributes)
- **System tab is completely clean** (no courier webhook settings, no custom code)
- **Courier webhook settings are empty** (no URLs, names, or configurations)
- **Custom settings are empty** (no custom CSS or code snippets)

### **❌ Failure Indicators:**
- Admin cannot log in
- App shows errors on load
- Storage still contains files
- Database has unexpected data
- Settings are missing or incorrect

## 📋 Reset Function Summary

The enhanced reset function now provides:

1. **Complete Cleanup**: Removes all business data and uploaded files
2. **Admin Preservation**: Maintains admin access and permissions
3. **App Stability**: Ensures app remains functional after reset
4. **Error Handling**: Robust error handling and logging
5. **Backup Creation**: Creates backup before reset for safety

This ensures a clean slate while maintaining the ability to continue using the app as an admin.
