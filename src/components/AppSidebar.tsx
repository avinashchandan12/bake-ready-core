import { 
  Home, 
  Package, 
  ShoppingCart, 
  ChefHat, 
  ClipboardList, 
  Calculator, 
  AlertTriangle, 
  BarChart3,
  LogOut,
  Truck,
  FileText,
  MapPin,
  Users
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Products", url: "/products", icon: Package },
  { title: "Raw Materials", url: "/raw-materials", icon: ShoppingCart },
  { title: "Stock Overview", url: "/stock-overview", icon: BarChart3 },
];

const productionItems = [
  { title: "Recipes", url: "/recipes", icon: ChefHat },
  { title: "Production Log", url: "/production-log", icon: ClipboardList },
  { title: "Production Estimator", url: "/production-estimator", icon: Calculator },
  { title: "Loss & Waste Log", url: "/loss-log", icon: AlertTriangle },
];

const orderItems = [
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Vendors", url: "/vendors", icon: Truck },
];

const grnItems = [
  { title: "GRN Entry", url: "/grn-entry", icon: FileText },
  { title: "Discrepancy Report", url: "/discrepancy-report", icon: AlertTriangle },
  { title: "Transport Log", url: "/transport-log", icon: MapPin },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = (isActiveRoute: boolean) =>
    isActiveRoute 
      ? "bg-gradient-to-r from-primary/20 to-accent/30 text-primary border-r-2 border-primary font-medium shadow-sm" 
      : "hover:bg-gradient-to-r hover:from-accent/10 hover:to-accent/20 transition-all duration-200";

  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} border-r border-border bg-gradient-to-b from-card to-card/95 shadow-elegant`}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-border bg-gradient-warm">
        <div className="flex items-center gap-3">
          {/* S.A. Foods Logo */}
          <div className="bg-gradient-to-br from-accent to-accent/80 p-2 rounded-lg shadow-warm border border-border">
            <div className="bg-primary text-primary-foreground w-8 h-8 rounded flex flex-col items-center justify-center text-xs font-bold">
              <div>S.</div>
              <div className="-mt-1">A.</div>
            </div>
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-lg text-primary">S.A. Foods</div>
              <div className="text-xs text-muted-foreground">Management System</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
            {!collapsed ? "Inventory Management" : "INV"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
            {!collapsed ? "Production Management" : "PROD"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {productionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
            {!collapsed ? "Order Management" : "ORD"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {orderItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
            {!collapsed ? "GRN & Transport" : "GRN"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {grnItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${getNavCls(isActive(item.url))}`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <Button
          variant="outline"
          onClick={signOut}
          className={`${collapsed ? "w-8 h-8 p-0" : "w-full"} transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground`}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}