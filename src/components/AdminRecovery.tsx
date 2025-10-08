import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/utils/toast";

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
      // First, let's check if the tables exist and have the right structure
      const { data: tableCheck, error: tableError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (tableError && tableError.code === '42P01') {
        // Table doesn't exist, show helpful message
        toast.error("Database tables not found. Please run the setup script first.");
        return;
      }

      // Check if user already has a profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        // Update existing profile to admin - only update fields that exist
        const updateData: any = { 
          updated_at: new Date().toISOString()
        };
        
        // Only update role if the column exists
        if ('role' in existingProfile) {
          updateData.role = 'admin';
        }
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new profile with only the fields that exist
        const insertData: any = {
          id: user.id
        };
        
        // Only include fields that exist in the table
        if (tableCheck && tableCheck.length > 0) {
          const sampleRow = tableCheck[0];
          if ('email' in sampleRow) insertData.email = user.email;
          if ('full_name' in sampleRow) insertData.full_name = user.user_metadata?.full_name || 'Admin User';
          if ('role' in sampleRow) insertData.role = 'admin';
          if ('user_id' in sampleRow) insertData.user_id = user.id;
        }

        const { error: insertError } = await supabase
          .from('profiles')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Check if user already has admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!existingRole) {
        // Insert admin role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'admin'
          });

        if (roleError) throw roleError;
      }

      toast.success("Admin access restored successfully! Refreshing page...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error('Restore admin error:', error);
      
      if (error.code === '42P01') {
        toast.error("Database tables not found. Please run the setup script first.");
      } else if (error.message?.includes('infinite recursion')) {
        toast.error("Database policy issue detected. Please run the setup script to fix policies.");
      } else {
        toast.error(error.message || 'Failed to restore admin access');
      }
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