import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      const { data, error } = await supabase.functions.invoke('export-data', {
        body: options,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      // Create backup file with proper structure
      const backupData = {
        backup: data.files,
        manifest: data.manifest,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename.replace('.zip', '.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Export completed: ${data.filename.replace('.zip', '.json')}`);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
      console.error('Export error:', error);
    },
  });

  const parseBackupFile = (file: File): Promise<Record<string, any>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          
          // Handle new backup format
          if (content.backup && content.manifest) {
            resolve(content.backup);
          }
          // Handle old format (direct files object)
          else if (content['manifest.json']) {
            resolve(content);
          }
          else {
            reject(new Error('Invalid backup format: missing manifest'));
          }
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const importData = useMutation({
    mutationFn: async (options: ImportOptions) => {
      toast.loading(
        options.dryRun ? 'Validating backup data...' : 'Importing data...', 
        { id: 'import-progress' }
      );

      const { data, error } = await supabase.functions.invoke('import-data', {
        body: options,
      });

      if (error) {
        toast.dismiss('import-progress');
        throw new Error(error.message || 'Import failed');
      }
      
      if (!data.success) {
        toast.dismiss('import-progress');
        throw new Error(data.error || 'Import operation was not successful');
      }

      return data;
    },
    onSuccess: (data) => {
      toast.dismiss('import-progress');
      
      if (data.dryRun) {
        const details = Object.entries(data.results || {})
          .map(([table, result]: [string, any]) => 
            `${table}: ${result.recordCount || 0} records`
          ).join(', ');
        
        toast.success(`Validation completed - ${details}`, {
          duration: 5000
        });
      } else {
        const successful = Object.entries(data.results || {})
          .filter(([_, result]: [string, any]) => result.status === 'success')
          .map(([table, result]: [string, any]) => 
            `${table}: ${result.recordCount || 0} records`
          );
          
        const failed = Object.entries(data.results || {})
          .filter(([_, result]: [string, any]) => result.status !== 'success')
          .map(([table, result]: [string, any]) => 
            `${table}: ${result.reason || 'failed'}`
          );

        let message = `Import completed: ${data.totalRecords} records across ${data.totalTables} tables`;
        if (successful.length > 0) {
          message += `\n✅ Imported: ${successful.join(', ')}`;
        }
        if (failed.length > 0) {
          message += `\n❌ Skipped: ${failed.join(', ')}`;
        }
        
        toast.success(message, { duration: 8000 });
      }
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Warnings: ${data.errors.join(', ')}`, { duration: 6000 });
      }
    },
    onError: (error) => {
      toast.dismiss('import-progress');
      toast.error(`Import failed: ${error.message}`, { duration: 6000 });
      console.error('Import error:', error);
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