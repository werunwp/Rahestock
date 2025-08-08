import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export const ThemeInitializer = () => {
  const { theme, setTheme } = useTheme();
  const { preferences, isLoading } = useUserPreferences();

  // Initialize theme from user preferences once loaded
  useEffect(() => {
    if (isLoading) return;
    
    const savedTheme = preferences.dark_mode ? "dark" : "light";
    if (theme !== savedTheme) {
      setTheme(savedTheme);
    }
  }, [isLoading, preferences.dark_mode, theme, setTheme]);

  // Apply compact view from user preferences
  useEffect(() => {
    if (isLoading) return;
    
    if (preferences.compact_view) {
      document.body.classList.add("compact-view");
    } else {
      document.body.classList.remove("compact-view");
    }
  }, [isLoading, preferences.compact_view]);

  return null;
};