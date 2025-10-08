import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/utils/toast";

interface ExportOptions {
  includeTables?: string[];
  excludeTables?: string[];
}

interface ImportOptions {
  files: Record<string, any>;
  dryRun?: boolean;
  options?: {
    overwriteExisting?: boolean;
    skipConflicts?: boolean;
  };
}

export const useDataBackup = () => {
  const exportData = useMutation({
    mutationFn: async (options: ExportOptions = {}) => {
      console.log('Starting client-side export with options:', options);
      
      try {
        // Client-side export - directly query tables
        const { includeTables = [] } = options;
        
        // Use default tables if none are specified
        const tablesToExport = includeTables.length > 0 ? includeTables : [
          'system_settings', 'business_settings', 'profiles', 'user_roles',
          'products', 'product_attributes', 'product_attribute_values', 'product_variants',
          'customers', 'sales', 'sales_items', 'inventory_logs', 'user_preferences', 'dismissed_alerts'
        ];

        const exportData: Record<string, any> = {};
        const errors: string[] = [];

        // Define table order for dependencies
        const tableOrder = [
          'system_settings', 'business_settings', 'profiles', 'user_roles',
          'products', 'product_attributes', 'product_attribute_values', 'product_variants',
          'customers', 'sales', 'sales_items', 'inventory_logs', 'user_preferences', 'dismissed_alerts'
        ];
        
        // Sort tables according to dependency order
        const orderedTables = tablesToExport.sort((a, b) => {
          const indexA = tableOrder.indexOf(a);
          const indexB = tableOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });

        // Export each table
        for (const table of orderedTables) {
          try {
            console.log(`Exporting table: ${table}`);
            const { data, error } = await supabase
              .from(table as any)
              .select('*');
              
            if (error) {
              console.error(`Error exporting ${table}:`, error);
              errors.push(`${table}: ${error.message}`);
            } else {
              exportData[table] = data || [];
              console.log(`Exported ${table}: ${data?.length || 0} records`);
            }
          } catch (err) {
            console.error(`Failed to export ${table}:`, err);
            errors.push(`${table}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }

        // Create manifest
        const manifest = {
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          tables: Object.keys(exportData),
          recordCounts: Object.fromEntries(
            Object.entries(exportData).map(([table, data]) => [table, data.length])
          ),
          errors: errors.length > 0 ? errors : undefined
        };

        // Create backup structure
      const backupData = {
          backup: exportData,
          manifest,
        exportedAt: new Date().toISOString()
      };
      
        return {
          success: true,
          filename: `backup-${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}_${new Date().toTimeString().split(' ')[0].replace(/:/g, '-')}.json`,
          files: exportData,
          manifest,
          backupData
        };

      } catch (error) {
        console.error('Client-side export error:', error);
        throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    onSuccess: (data) => {
      console.log('Export successful, creating download:', data);
      
      try {
        // Create and download the backup file
        const blob = new Blob([JSON.stringify(data.backupData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
        link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

        toast.success(`Export completed: ${data.filename}`);
      } catch (downloadError) {
        console.error('Download creation failed:', downloadError);
        toast.error('Export completed but download failed. Check console for details.');
      }
    },
    onError: (error) => {
      console.error('Export error in onError:', error);
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const parseBackupFile = (file: File): Promise<Record<string, any>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          console.log('Parsed backup file content:', content);
          
          // Handle new backup format (what we export)
          if (content.backup && content.manifest) {
            console.log('Detected new backup format');
            // Convert to the format expected by import
            const files: Record<string, any> = {
              'manifest.json': content.manifest
            };
            
            // Add each table as a separate file
            for (const [tableName, tableData] of Object.entries(content.backup)) {
              files[`${tableName}.json`] = tableData;
            }
            
            resolve(files);
          }
          // Handle old format (direct files object with manifest.json)
          else if (content['manifest.json']) {
            console.log('Detected old backup format');
            resolve(content);
          }
          else {
            console.error('Invalid backup format - content:', content);
            reject(new Error('Invalid backup format: missing manifest or backup data'));
          }
        } catch (error) {
          console.error('JSON parse error:', error);
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const importData = useMutation({
    mutationFn: async (options: ImportOptions) => {
      console.log('Starting client-side import with options:', options);
      
      try {
        const { files, dryRun = true, options: importOptions = {} } = options;
        const { overwriteExisting = false, skipConflicts = false } = importOptions;
        
        if (!files['manifest.json']) {
          throw new Error('Invalid backup: missing manifest.json');
        }
        
        const manifest = files['manifest.json'];
        console.log('Import manifest:', manifest);
        
        const results: Record<string, any> = {};
        const errors: string[] = [];
        let totalRecords = 0;
        let totalTables = 0;
        
        // Define import order (reverse of export order for dependencies)
        const importOrder = [
          'dismissed_alerts', 'user_preferences', 'inventory_logs', 'sales_items', 
          'sales', 'customers', 'product_variants', 'product_attribute_values', 
          'product_attributes', 'products', 'profiles', 'user_roles', 
          'business_settings', 'system_settings'
        ];
        
        // Sort tables according to import order
        const orderedTables = Object.keys(files)
          .filter(key => key !== 'manifest.json')
          .map(key => key.replace('.json', ''))
          .sort((a, b) => {
            const indexA = importOrder.indexOf(a);
            const indexB = importOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        
        console.log('Importing tables in order:', orderedTables);
        
        for (const tableName of orderedTables) {
          const fileName = `${tableName}.json`;
          const tableData = files[fileName];
          
          if (!tableData || !Array.isArray(tableData)) {
            console.warn(`Skipping ${tableName}: invalid data format`);
            continue;
          }
          
          try {
            console.log(`Processing ${tableName}: ${tableData.length} records`);
            
            if (dryRun) {
              // Dry run - just validate data
              results[tableName] = {
                status: 'validated',
                recordCount: tableData.length,
                message: 'Data validated successfully'
              };
              totalRecords += tableData.length;
              totalTables++;
            } else {
              // Actual import
              if (tableData.length === 0) {
                results[tableName] = {
                  status: 'skipped',
                  recordCount: 0,
                  reason: 'No records to import'
                };
                continue;
              }
              
              // Check if table exists and has data
              const { data: existingData, error: checkError } = await supabase
                .from(tableName as any)
                .select('count', { count: 'exact', head: true });
              
              if (checkError) {
                console.error(`Error checking ${tableName}:`, checkError);
                results[tableName] = {
                  status: 'failed',
                  recordCount: 0,
                  reason: `Table check failed: ${checkError.message}`
                };
                errors.push(`${tableName}: ${checkError.message}`);
                continue;
              }
              
              const hasExistingData = existingData && (existingData as any) > 0;
              
              if (hasExistingData && !overwriteExisting && skipConflicts) {
                // Skip if data exists and we're not overwriting
                results[tableName] = {
                  status: 'skipped',
                  recordCount: 0,
                  reason: 'Table has existing data and overwrite is disabled'
                };
                continue;
              }
              
              let importedCount = 0;
              let updatedCount = 0;
              let skippedCount = 0;
              
              // Process each record individually to handle duplicates
              for (const record of tableData) {
                try {
                  // Check if record already exists based on primary key or unique constraints
                  let existingRecord = null;
                  let checkQuery = supabase.from(tableName as any);
                  
                  // Handle different table structures for checking existing records
                  if (tableName === 'system_settings' || tableName === 'business_settings') {
                    // These tables typically have one record per setting key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('key', record.key)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'profiles') {
                    // Profiles table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'products') {
                    // Products table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'customers') {
                    // Customers table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'sales') {
                    // Sales table uses invoice_number as unique key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('invoice_number', record.invoice_number)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'sales_items') {
                    // Sales items table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'inventory_logs') {
                    // Inventory logs table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'user_preferences') {
                    // User preferences table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'dismissed_alerts') {
                    // Dismissed alerts table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'product_variants') {
                    // Product variants table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'product_attributes') {
                    // Product attributes table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'product_attribute_values') {
                    // Product attribute values table uses composite key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('attribute_id', record.attribute_id)
                      .eq('value', record.value)
                      .single();
                    existingRecord = existing;
                  } else if (tableName === 'user_roles') {
                    // User roles table uses id as primary key
                    const { data: existing } = await checkQuery
                      .select('*')
                      .eq('id', record.id)
                      .single();
                    existingRecord = existing;
                  }
                  
                  if (existingRecord) {
                    // Record exists - check if it needs updating
                    if (overwriteExisting) {
                      // Update existing record
                      const { error: updateError } = await supabase
                        .from(tableName as any)
                        .update(record)
                        .eq('id', existingRecord.id);
                      
                      if (updateError) {
                        console.warn(`Failed to update ${tableName} record:`, updateError);
                        skippedCount++;
                      } else {
                        updatedCount++;
                      }
                    } else {
                      // Skip existing record
                      skippedCount++;
                    }
                  } else {
                    // Record doesn't exist - insert new one
                    const { error: insertError } = await supabase
                      .from(tableName as any)
                      .insert(record);
                    
                    if (insertError) {
                      console.warn(`Failed to insert ${tableName} record:`, insertError);
                      skippedCount++;
                    } else {
                      importedCount++;
                    }
                  }
                } catch (recordError) {
                  console.warn(`Error processing ${tableName} record:`, recordError);
                  skippedCount++;
                }
              }
              
              // Set result based on what happened
              if (importedCount > 0 || updatedCount > 0) {
                results[tableName] = {
                  status: 'success',
                  recordCount: importedCount + updatedCount,
                  message: `Imported ${importedCount} new records, updated ${updatedCount} existing records, skipped ${skippedCount} duplicates`
                };
                totalRecords += importedCount + updatedCount;
                totalTables++;
              } else {
                results[tableName] = {
                  status: 'skipped',
                  recordCount: 0,
                  reason: `All ${tableData.length} records already exist and no updates were made`
                };
              }
            }
          } catch (err) {
            console.error(`Failed to process ${tableName}:`, err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            results[tableName] = {
              status: 'failed',
              recordCount: 0,
              reason: errorMessage
            };
            errors.push(`${tableName}: ${errorMessage}`);
          }
        }
        
        return {
          success: true,
          results,
          totalRecords,
          totalTables,
          errors: errors.length > 0 ? errors : undefined
        };
        
      } catch (error) {
        console.error('Client-side import error:', error);
        throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    onSuccess: (data) => {
      console.log('Import successful:', data);
      
      // Check if this was a dry run by looking at the results structure
      const isDryRun = Object.values(data.results || {}).some((result: any) => 
        result.status === 'validated'
      );
      
      if (isDryRun) {
        const details = Object.entries(data.results || {})
          .map(([table, result]: [string, any]) => 
            `${table}: ${result.recordCount || 0} records`
          ).join(', ');
        
        // Create a clean validation message
        let message = `🔍 Validation Summary\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Total Records: ${data.totalRecords}\n`;
        message += `Tables Validated: ${data.totalTables}\n\n`;
        message += `📋 Tables in Backup:\n`;
        message += `┌─────────────────────────────┬─────────────┐\n`;
        message += `│ Table Name                  │ Records     │\n`;
        message += `├─────────────────────────────┼─────────────┤\n`;
        
        Object.entries(data.results || {}).forEach(([table, result]: [string, any], index) => {
          const tableName = table.padEnd(28);
          const recordCount = (result.recordCount || 0).toString().padStart(11);
          message += `│ ${tableName} │ ${recordCount} │\n`;
        });
        
        message += `└─────────────────────────────┴─────────────┘\n`;
        
        toast.success(message, {
          duration: 8000
        });
      } else {
        const successful = Object.entries(data.results || {})
          .filter(([_, result]: [string, any]) => result.status === 'success')
          .map(([table, result]: [string, any]) => 
            `${table}: ${result.recordCount || 0} records`
          );
          
        const skipped = Object.entries(data.results || {})
          .filter(([_, result]: [string, any]) => result.status === 'skipped')
          .map(([table, result]: [string, any]) => 
            `${table}: ${result.reason || 'skipped'}` 
          );
          
        const failed = Object.entries(data.results || {})
          .filter(([_, result]: [string, any]) => result.status === 'failed')
          .map(([table, result]: [string, any]) => 
            `${table}: ${result.reason || 'failed'}`
          );

        // Create a clean, organized message
        let message = `📊 Import Summary\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Total Records: ${data.totalRecords}\n`;
        message += `Tables Processed: ${data.totalTables}\n`;
        message += `Backup Records: ${Object.values(data.results || {}).reduce((sum: number, result: any) => {
          if (result.status === 'validated') return sum + (result.recordCount || 0);
          return sum;
        }, 0)}\n\n`;
        
        if (successful.length > 0) {
          message += `✅ Successfully Processed:\n`;
          message += `┌─────────────────────────────┬─────────────┐\n`;
          message += `│ Table Name                  │ Records     │\n`;
          message += `├─────────────────────────────┼─────────────┤\n`;
          successful.forEach((item, index) => {
            const [table, count] = item.split(': ');
            const tableName = table.padEnd(28);
            const recordCount = count.padStart(11);
            message += `│ ${tableName} │ ${recordCount} │\n`;
          });
          message += `└─────────────────────────────┴─────────────┘\n\n`;
        }
        
        if (skipped.length > 0) {
          message += `⏭️  Skipped (Already Exist):\n`;
          message += `┌─────────────────────────────┬─────────────────────────────────────┐\n`;
          message += `│ Table Name                  │ Reason                              │\n`;
          message += `├─────────────────────────────┼─────────────────────────────────────┤\n`;
          skipped.forEach((item, index) => {
            // Clean up the reason text to be more concise
            const cleanReason = item.includes('All') && item.includes('already exist') 
              ? `${item.split(':')[0]}: ${item.split('All ')[1].split(' records')[0]} records exist`
              : item;
            const [table, reason] = cleanReason.split(': ');
            const tableName = (table || '').padEnd(28);
            const reasonText = (reason || '').padEnd(35);
            message += `│ ${tableName} │ ${reasonText} │\n`;
          });
          message += `└─────────────────────────────┴─────────────────────────────────────┘\n\n`;
        }
        
        if (failed.length > 0) {
          message += `❌ Failed:\n`;
          message += `┌─────────────────────────────┬─────────────────────────────────────┐\n`;
          message += `│ Table Name                  │ Error                               │\n`;
          message += `├─────────────────────────────┼─────────────────────────────────────┤\n`;
          failed.forEach((item, index) => {
            const [table, error] = item.split(': ');
            const tableName = (table || '').padEnd(28);
            const errorText = (error || '').padEnd(35);
            message += `│ ${tableName} │ ${errorText} │\n`;
          });
          message += `└─────────────────────────────┴─────────────────────────────────────┘\n`;
        }
        
        // Add detailed breakdown for successful imports if any
        const detailedResults = Object.entries(data.results || {})
          .filter(([_, result]: [string, any]) => result.status === 'success')
          .map(([table, result]: [string, any]) => {
            if (result.message && result.message.includes('new records') && result.message.includes('updated')) {
              return `${table}: ${result.message}`;
            }
            return `${table}: ${result.recordCount || 0} records`;
          });
        
        if (detailedResults.length > 0) {
          message += `\n📋 Detailed Results:\n`;
          message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          message += `┌─────────────────────────────┬─────────────────────────────────────┐\n`;
          message += `│ Table Name                  │ Details                             │\n`;
          message += `├─────────────────────────────┼─────────────────────────────────────┤\n`;
          detailedResults.forEach((item, index) => {
            const [table, details] = item.split(': ');
            const tableName = (table || '').padEnd(28);
            const detailsText = (details || '').padEnd(35);
            message += `│ ${tableName} │ ${detailsText} │\n`;
          });
          message += `└─────────────────────────────┴─────────────────────────────────────┘\n`;
        }
        
        toast.success(message, { duration: 10000 });
      }
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Warnings: ${data.errors.join(', ')}`, { duration: 6000 });
      }
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`, { duration: 6000 });
    },
  });

  return {
    exportData,
    importData,
    parseBackupFile,
    isExporting: exportData.isPending,
    isImporting: importData.isPending,
  };
};