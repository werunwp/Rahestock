import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SecurityTab = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordUpdate = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success("Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input 
            id="currentPassword" 
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Enter current password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input 
            id="newPassword" 
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="Enter new password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input 
            id="confirmPassword" 
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirm new password"
          />
        </div>
        <Button onClick={handlePasswordUpdate} disabled={isUpdating}>
          {isUpdating ? 'Updating...' : 'Update Password'}
        </Button>
      </CardContent>
    </Card>
  );
};