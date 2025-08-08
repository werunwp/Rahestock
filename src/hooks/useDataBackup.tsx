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
      const { data, error } = await supabase.functions.invoke('import-data', {
        body: options,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      if (data.dryRun) {
        toast.success('Validation completed successfully');
      } else {
        toast.success(`Import completed: ${data.totalRecords} records across ${data.totalTables} tables`);
      }
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
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