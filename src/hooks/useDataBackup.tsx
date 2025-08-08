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
      // Create and download ZIP file
      const zipContent = JSON.stringify(data.files, null, 2);
      const blob = new Blob([zipContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Export completed: ${data.filename}`);
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
      console.error('Export error:', error);
    },
  });

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
    isExporting: exportData.isPending,
    isImporting: importData.isPending,
  };
};