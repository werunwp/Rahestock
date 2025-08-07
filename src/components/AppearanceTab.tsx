import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export const AppearanceTab = () => {
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  const { theme, setTheme } = useTheme();

  // Sync theme with preferences
  useEffect(() => {
    if (preferences.dark_mode) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, [preferences.dark_mode, setTheme]);

  const handleDarkModeToggle = (value: boolean) => {
    updatePreferences({ dark_mode: value });
    setTheme(value ? "dark" : "light");
  };

  const handleCompactViewToggle = (value: boolean) => {
    updatePreferences({ compact_view: value });
    // Apply compact view styles to body
    if (value) {
      document.body.classList.add("compact-view");
    } else {
      document.body.classList.remove("compact-view");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Dark Mode</Label>
            <p className="text-sm text-muted-foreground">
              Toggle between light and dark themes
            </p>
          </div>
          <Switch 
            checked={preferences.dark_mode}
            onCheckedChange={handleDarkModeToggle}
            disabled={isUpdating}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Compact View</Label>
            <p className="text-sm text-muted-foreground">
              Use a more compact layout for tables and lists
            </p>
          </div>
          <Switch 
            checked={preferences.compact_view}
            onCheckedChange={handleCompactViewToggle}
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
};