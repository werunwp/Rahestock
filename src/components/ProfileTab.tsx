import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProfileTab = () => {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (!user?.id) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(profileForm)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input 
              id="fullName" 
              value={profileForm.full_name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Enter your full name" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={user?.email || ''}
              placeholder="Your email address" 
              disabled 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input 
              id="phone" 
              value={profileForm.phone}
              onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter your phone number" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input 
              id="userId" 
              value={user?.id || ''}
              placeholder="Your user ID" 
              disabled 
            />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isUpdating}>
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
};