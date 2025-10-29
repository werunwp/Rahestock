# Courier Name Feature - Setup Instructions

## ✅ What Was Added

A **Courier Name** dropdown has been added to the sales history table to assign couriers to sales.

### Changes Made:

1. **Database Migration** 
   - Added `courier_name` column to the `sales` table
   - Migration file: `supabase/migrations/20250128000007_add_courier_name_to_sales.sql`

2. **Sales History Table**
   - Added "Courier Name" column between "CN Number" and "Courier Status"
   - Shows dropdown selector for each sale
   - Updates in real-time when changed

3. **CourierNameSelector Component**
   - New component similar to ManualCourierStatusSelector
   - Dropdown with all courier options
   - Color-coded badges for each courier
   - Real-time updates to database

4. **TypeScript Interfaces**
   - Updated `Sale` interface to include `courier_name?: string | null`
   - Properly typed as optional string field

---

## 🚀 How to Apply the Changes

### Step 1: Run the Database Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the following SQL:

```sql
-- Add courier_name field to sales table for tracking courier assignments
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS courier_name TEXT;

COMMENT ON COLUMN public.sales.courier_name IS 'Name of the courier assigned to this sale';
```

3. Click **Run** to execute the migration
4. Verify the column was added successfully

### Step 2: Test the Feature

1. **View Sales History**
   - Open the app and go to Sales page
   - You should see a new "Courier Name" column in the table

2. **Assign Couriers**
   - Click on any dropdown in the "Courier Name" column
   - Select from the available courier options:
     - Sundorban
     - Janani
     - SR
     - AJR
     - Karatoa
     - Bangladesh
     - Ahmed
     - Steadfast
     - SA
   - Changes are saved automatically

3. **Verify Changes**
   - The courier name should update immediately
   - Check that the change persists after page refresh

---

## 📋 Available Courier Options

The dropdown includes these courier options with color-coded badges:

| Courier | Color |
|---------|-------|
| Sundorban | Blue |
| Janani | Green |
| SR | Purple |
| AJR | Orange |
| Karatoa | Pink |
| Bangladesh | Indigo |
| Ahmed | Teal |
| Steadfast | Cyan |
| SA | Amber |
| Not Assigned | Gray |

---

## 🔧 How It Works

### For Sales Management:

1. **Assign Courier**: Select a courier from the dropdown for any sale
2. **Change Courier**: Update the courier assignment at any time
3. **Remove Assignment**: Select "Not Assigned" to remove courier
4. **Visual Feedback**: Each courier has a unique color-coded badge

### Benefits:

- ✅ Track which courier is handling each sale
- ✅ Easy to reassign couriers when needed
- ✅ Visual identification with color-coded badges
- ✅ Real-time updates without page refresh
- ✅ Complete audit trail for courier assignments

---

## 🎨 Visual Design

- **Color-coded Badges**: Each courier has a unique color for easy identification
- **Inline Dropdown**: Compact design that fits in the table
- **Real-time Updates**: Changes are saved immediately
- **Loading States**: Shows spinner while updating
- **Toast Notifications**: Success/error messages for user feedback

---

## ✨ Next Steps

After applying the migration, the Courier Name feature will be fully functional! You can:

1. Start assigning couriers to existing sales
2. Use the dropdown to change courier assignments
3. Track which courier is handling each order
4. Filter and search by courier name (if needed in future)

If you encounter any issues, check:
- Database migration ran successfully
- No TypeScript errors in the console
- Browser cache is cleared (Ctrl+Shift+R)

The courier assignment system is now ready to help you manage your delivery operations! 🚀

