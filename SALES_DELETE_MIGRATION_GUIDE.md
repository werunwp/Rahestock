# Sales Delete Functionality - Migration Guide

## Overview
I've implemented the sales delete functionality with soft delete mechanism. The code changes are complete, but you need to run a database migration to add the required columns.

## What's Been Implemented

### 1. Code Changes ✅
- **useSales.tsx**: Added `deleteSale` mutation for soft deletion
- **Sales.tsx**: Added delete button and handler function
- **useCustomers.tsx**: Updated customer deletion to exclude soft-deleted sales
- **Database Migration**: Created migration file `20250115000002_add_soft_delete_to_sales.sql`

### 2. Database Migration Required ⚠️
You need to run this SQL in your Supabase SQL editor:

```sql
-- Add soft delete functionality to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better performance when filtering deleted sales
CREATE INDEX IF NOT EXISTS idx_sales_is_deleted ON public.sales(is_deleted);

-- Add comment to document the new columns
COMMENT ON COLUMN public.sales.is_deleted IS 'Soft delete flag for sales records';
COMMENT ON COLUMN public.sales.deleted_at IS 'Timestamp when the sale was soft deleted';
```

## How to Run the Migration

### Option 1: Supabase SQL Editor (Recommended)
1. Go to YOUR_SUPABASE_URL_HERE/project/default/sql/new?skip=true
2. Paste the SQL above
3. Click "Run" to execute the migration

### Option 2: Command Line (if you have Supabase CLI configured)
```bash
npx supabase db push
```

## How the Delete Functionality Works

### Soft Delete Mechanism
- Sales are not permanently deleted from the database
- Instead, they are marked with `is_deleted = true` and `deleted_at = timestamp`
- This preserves data integrity and allows for potential recovery

### User Experience
- Delete button appears in the Actions column of the sales table
- Clicking delete shows a confirmation dialog
- After confirmation, the sale is soft-deleted and disappears from the list
- Customer deletion now works properly (only checks for non-deleted sales)

### Data Integrity
- Customer statistics are recalculated automatically
- Inventory is restored when sales are deleted
- All related data (sales_items, inventory_logs) remain intact

## Testing the Functionality

After running the migration:

1. **Test Sales Deletion**:
   - Go to the Sales page
   - Click the trash icon (🗑️) next to any sale
   - Confirm the deletion
   - The sale should disappear from the list

2. **Test Customer Deletion**:
   - Go to the Customers page
   - Try to delete a customer who had sales (that you've now deleted)
   - The customer should delete successfully

3. **Verify Data Integrity**:
   - Check that customer statistics update correctly
   - Verify that inventory is restored when sales are deleted

## Files Modified

- `src/hooks/useSales.tsx` - Added deleteSale mutation
- `src/pages/Sales.tsx` - Added delete button and handler
- `src/hooks/useCustomers.tsx` - Updated customer deletion logic
- `supabase/migrations/20250115000002_add_soft_delete_to_sales.sql` - Database migration

## Next Steps

1. Run the database migration using one of the methods above
2. Test the delete functionality
3. Verify that customer deletion now works properly
4. The sales delete functionality will be fully operational

## Troubleshooting

If you encounter issues:

1. **Migration fails**: Check that you have the correct permissions in Supabase
2. **Delete button not working**: Ensure the migration ran successfully
3. **Customer still can't be deleted**: Check that all associated sales are soft-deleted

The implementation is complete and ready to use once the migration is run!
