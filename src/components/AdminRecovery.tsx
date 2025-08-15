import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function AdminRecovery() {
  const [isRestoring, setIsRestoring] = useState(false);
  const { user } = useAuth();

  const handleRestore = async () => {
    if (!user) {
      toast.error("You must be logged in to restore admin access");
      return;
    }

    setIsRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('restore-admin', {
        body: { userId: user.id }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success("Admin access restored successfully! Refreshing page...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(data?.error || 'Failed to restore admin access');
      }
    } catch (error) {
      console.error('Restore admin error:', error);
      toast.error(error.message || 'Failed to restore admin access');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
            <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-xl">Admin Access Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            It looks like your admin privileges need to be restored after the app reset. 
            Click the button below to restore your admin access and system settings.
          </p>
          <Button 
            onClick={handleRestore}
            disabled={isRestoring}
            className="w-full"
            size="lg"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Restoring Access...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restore Admin Access
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}