import React, { useState } from "react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDataBackup } from "@/hooks/useDataBackup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export const AppResetControls = () => {
  const [confirmText, setConfirmText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { exportData } = useDataBackup();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const resetApp = useMutation({
    mutationFn: async () => {
      try {
        // First create a backup
        toast.loading("Creating backup before reset...", { id: "reset-progress" });
        await exportData.mutateAsync({});

        // Then proceed with reset
        toast.loading("Resetting app data...", { id: "reset-progress" });
        
        console.log("Calling reset-app function...");
        const { data, error } = await supabase.functions.invoke('reset-app', {
          body: { userId: user?.id },
        });

        console.log("Function response:", { data, error });

        if (error) {
          console.error("Supabase function error:", error);
          throw new Error(`Function error: ${error.message || JSON.stringify(error)}`);
        }
        
        if (!data) {
          throw new Error('No response data received from function');
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Reset operation was not successful');
        }

        return data;
      } catch (error) {
        console.error("Reset mutation error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast.dismiss("reset-progress");
      toast.success(`App reset completed successfully. Backup saved as ${data.backupFilename}`);
      setIsDialogOpen(false);
      setConfirmText("");
      
      // Refresh the page to show empty state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error) => {
      toast.dismiss("reset-progress");
      toast.error(`Reset failed: ${error.message}`);
      console.error('Reset error:', error);
    },
  });

  const handleReset = () => {
    if (confirmText === "CONFIRM") {
      resetApp.mutate();
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Reset App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Permanently delete all data from the app's database and return to a fresh state.
            A backup will be automatically created before the reset.
          </p>
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive font-medium">
              This action is irreversible except by restoring from backup.
            </p>
          </div>
        </div>

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Reset App
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm App Reset
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <div className="text-sm space-y-2">
                  <p className="font-semibold">This will permanently delete:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>All products and inventory</li>
                    <li>All sales records and invoices</li>
                    <li>All customer data</li>
                    <li>All user profiles and settings</li>
                    <li>All logs and import histories</li>
                  </ul>
                </div>
                
                <div className="bg-muted p-3 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Auto-backup</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A complete backup will be automatically downloaded before reset.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmText" className="text-sm font-medium">
                    Type "CONFIRM" to proceed:
                  </Label>
                  <Input
                    id="confirmText"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type CONFIRM exactly"
                    className="text-center"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText !== "CONFIRM" || resetApp.isPending}
                onClick={handleReset}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {resetApp.isPending ? "Resetting..." : "Proceed with Reset"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};