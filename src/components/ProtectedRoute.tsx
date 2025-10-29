import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import { AdminRecovery } from "./AdminRecovery";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { needsRecovery, isLoading: roleLoading, userRole } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Only show recovery screen if user has NO role at all
  // Don't show to managers, staff, or other valid roles
  if (needsRecovery && !userRole) {
    return <AdminRecovery />;
  }

  return <>{children}</>;
};