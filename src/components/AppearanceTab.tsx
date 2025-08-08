import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export const AppearanceTab = () => {
  const { preferences, updatePreferences, isUpdating, isLoading } = useUserPreferences();
  const { theme, setTheme } = useTheme();

  // Sync theme with saved preferences after load to avoid flicker
  useEffect(() => {
    if (isLoading) return;
    setTheme(preferences.dark_mode ? "dark" : "light");
  }, [isLoading, preferences.dark_mode, setTheme]);

  // Apply compact view class from saved preferences after load and on change
  useEffect(() => {
    if (isLoading) return;
    if (preferences.compact_view) {
      document.body.classList.add("compact-view");
    } else {
      document.body.classList.remove("compact-view");
    }
  }, [isLoading, preferences.compact_view]);

  const handleDarkModeToggle = (value: boolean) => {
    updatePreferences(
      { dark_mode: value },
      {
        onSuccess: () => {
          setTheme(value ? "dark" : "light");
        },
        onError: () => {
          // Revert visual theme to last saved value
          setTheme(preferences.dark_mode ? "dark" : "light");
        },
      }
    );
  };

  const handleCompactViewToggle = (value: boolean) => {
    // Optimistically apply compact view class
    if (value) {
      document.body.classList.add("compact-view");
    } else {
      document.body.classList.remove("compact-view");
    }

    updatePreferences(
      { compact_view: value },
      {
        onError: () => {
          // Revert compact view class on failure
          if (preferences.compact_view) {
            document.body.classList.add("compact-view");
          } else {
            document.body.classList.remove("compact-view");
          }
        },
      }
    );
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