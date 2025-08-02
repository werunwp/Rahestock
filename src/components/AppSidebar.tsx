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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md mx-1 px-2 py-1.5" 
      : "hover:bg-accent hover:text-accent-foreground rounded-md mx-1 px-2 py-1.5";
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const MenuItemWithTooltip = ({ item }: { item: typeof menuItems[0] }) => {
    const navLink = (
      <NavLink 
        to={item.url} 
        className={`flex items-center gap-3 ${getNavClass(item.url)}`}
        onClick={handleMenuItemClick}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && <span className="text-sm">{item.title}</span>}
      </NavLink>
    );

    if (isCollapsed && !isMobile) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{navLink}</div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return navLink;
  };

  const SettingsWithTooltip = () => {
    const navLink = (
      <NavLink 
        to="/settings" 
        className={`flex items-center gap-3 ${getNavClass("/settings")}`}
        onClick={handleMenuItemClick}
      >
        <Settings className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && <span className="text-sm">Settings</span>}
      </NavLink>
    );

    if (isCollapsed && !isMobile) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{navLink}</div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return navLink;
  };

  return (
    <Sidebar className={isCollapsed ? "w-12" : "w-36"} collapsible="icon">
      <SidebarContent className="p-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium px-1 mb-1">
            {!isCollapsed && "Main Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-8 text-sm">
                    <MenuItemWithTooltip item={item} />
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
                <SidebarMenuButton asChild className="h-8 text-sm">
                  <SettingsWithTooltip />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start h-8 text-sm"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          {!isCollapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}