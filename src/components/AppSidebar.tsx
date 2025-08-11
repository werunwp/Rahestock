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
import { PanelLeft } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Products", url: "/products", icon: Package },
  { title: "Inventory", url: "/inventory", icon: Archive },
  { title: "Sales (POS)", url: "/sales", icon: ShoppingCart },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Alerts", url: "/alerts", icon: Bell },
];

export function AppSidebar() {
  const { state, setOpenMobile, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
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
          <SidebarGroupLabel className="text-sm font-medium">
            {!isCollapsed && "Main Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
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