# CN Number Feature - Setup Instructions

## ✅ What Was Added

A **CN (Consignment Number)** field has been added to the sales system to track offline courier shipments.

### Changes Made:

1. **Database Migration** 
   - Added `cn_number` column to the `sales` table
   - Migration file: `supabase/migrations/20250128000006_add_cn_to_sales.sql`

2. **Sales History Table**
   - Added "CN Number" column showing the CN for each sale
   - Shows "-" if no CN number is set

3. **Add Sale Dialog**
   - Added CN Number field next to Additional Info field
   - Optional field with placeholder "Consignment number"

4. **Edit Sale Dialog**
   - CN Number field is available for editing existing sales
   - Preserves existing CN numbers when loading

5. **TypeScript Interfaces**
   - Updated all Sale-related interfaces to include `cn_number`
   - Properly typed as optional string field

---

## 🚀 How to Apply the Changes

### Step 1: Run the Database Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the following SQL:

```sql
-- Add CN (Consignment Number) field to sales table for offline courier tracking
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cn_number TEXT;

COMMENT ON COLUMN public.sales.cn_number IS 'Consignment Number from offline courier (manually entered)';
```

3. Click **Run** to execute the migration
4. Verify the column was added successfully

### Step 2: Test the Feature

1. **Create a New Sale**
   - Open the app
   - Click "New Sale"
   - Fill in customer and product details
   - Enter a CN number in the "CN Number" field (e.g., "CN123456789")
   - Save the sale

2. **View in Sales History**
   - Check the sales history table
   - The CN Number column should show your entered CN number

3. **Edit an Existing Sale**
   - Click "Edit" on a sale
   - The CN Number field should show the existing CN (or be empty)
   - Update it and save
   - Verify the changes are reflected in the sales history

---

## 📋 How to Use CN Numbers

### For Offline Couriers:

1. When you send a package via offline courier (not using the API)
2. The courier will give you a **Consignment Number (CN)**
3. Enter this CN number in the sale record:
   - Either when creating the sale
   - Or by editing an existing sale

### Benefits:

- ✅ Track all offline courier shipments
- ✅ Keep CN numbers organized with each sale
- ✅ Easy to reference when following up with courier
- ✅ Complete audit trail for deliveries

---

## 🔧 Technical Details

### Database Schema:
```sql
sales.cn_number (TEXT, nullable)
```

### Field Location:
- **Add Sale Dialog**: Bottom section, next to "Additional Info"
- **Edit Sale Dialog**: Same location as Add Sale
- **Sales History**: New column between "Amount" and "Courier Status"

### Data Flow:
1. User enters CN in dialog
2. Stored in `sales.cn_number` column
3. Displayed in sales history table
4. Available for editing at any time

---

## ✨ Next Steps

After applying the migration, the CN Number feature will be fully functional! You can:

1. Start adding CN numbers to new sales
2. Update existing sales with CN numbers
3. Filter/search by CN number (search field already supports it)

If you encounter any issues, check:
- Database migration ran successfully
- No TypeScript errors in the console
- Browser cache is cleared (Ctrl+Shift+R)


