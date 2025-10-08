import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useCurrentPageTitle } from "@/hooks/useCurrentPageTitle";
import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GlobalAlertBanner } from "@/components/GlobalAlertBanner";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const { businessSettings } = useBusinessSettings();
  const currentPageTitle = useCurrentPageTitle();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <GlobalAlertBanner />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 px-4">
            <SidebarTrigger className="md:hidden mr-2" />
            <div className="flex-1">
              <h1 className="font-semibold">
                {currentPageTitle}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};