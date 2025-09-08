import { useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Bell,
  Settings,
  LogOut,
  Home,
  Archive,
  Shield,
  Tag,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { PanelLeft } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home, permissionKey: 'access.dashboard' },
  { title: "Products", url: "/products", icon: Package, permissionKey: 'products.view' },
  { title: "Inventory", url: "/inventory", icon: Archive, permissionKey: 'inventory.view' },
  { title: "Sales (POS)", url: "/sales", icon: ShoppingCart, permissionKey: 'sales.create' },
  { title: "Customers", url: "/customers", icon: Users, permissionKey: 'customers.view' },
  { title: "Reports", url: "/reports", icon: BarChart3, permissionKey: 'reports.view' },
  { title: "Invoices", url: "/invoices", icon: FileText, permissionKey: 'invoices.view' },
  { title: "Alerts", url: "/alerts", icon: Bell, permissionKey: 'access.alerts' },
  { title: "Attributes", url: "/attributes", icon: Tag, permissionKey: 'products.view' },
];

export function AppSidebar() {
  const { state, setOpenMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin, hasPermission, isLoading } = useUserRole();
  const { businessSettings } = useBusinessSettings();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
      : "hover:bg-accent hover:text-accent-foreground";
  };

  const handleMobileNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    setOpenMobile(false);
  };

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-48"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          {/* Business Logo */}
          {businessSettings?.logo_url && !isCollapsed && (
            <div className="flex justify-center mb-4 px-2">
              <img 
                src={businessSettings.logo_url} 
                alt="Business Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
          )}
          <SidebarGroupLabel className="text-sm font-medium">
            {!isCollapsed && "Main Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                // Show skeleton items while loading
                Array.from({ length: 8 }, (_, i) => (
                  <SidebarMenuItem key={`skeleton-${i}`}>
                    <div className="h-10 bg-muted animate-pulse rounded-md" />
                  </SidebarMenuItem>
                ))
              ) : (
                menuItems.filter((item) => hasPermission(item.permissionKey)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 ${getNavClass(item.url)}`}
                      onClick={handleMobileNavClick}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                  </SidebarMenuItem>
              ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {!isLoading && hasPermission('settings.view_business') && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/settings" 
                      className={`flex items-center gap-3 ${getNavClass("/settings")}`}
                      onClick={handleMobileNavClick}
                    >
                      <Settings className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>Settings</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Admin Panel - Only for admins */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/admin" 
                      className={`flex items-center gap-3 ${getNavClass("/admin")}`}
                      onClick={handleMobileNavClick}
                    >
                      <Shield className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!isCollapsed && "Sign Out"}
        </Button>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleSidebar} className="flex items-center gap-3">
              <PanelLeft className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}