import { Link, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  Settings,
  Users,
  Building,
  Tags,
  TrendingUp,
  BarChart3,
  Plus,
  LogOut,
  Home,
  ChevronLeft,
  FolderOpen,
  ChevronRight,
  Factory
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    current: false,
  },
  {
    name: "Inventory",
    items: [
      {
        name: "Goods Receipt (GRN)",
        href: "/grn",
        icon: Plus,
      },
      {
        name: "Stock Levels",
        href: "/stock-levels",
        icon: Warehouse,
      },
    ],
  },
  {
    name: "Orders",
    items: [
      {
        name: "Sales Orders",
        href: "/sales-orders",
        icon: ShoppingCart,
      },
      {
        name: "Purchase Orders",
        href: "/purchase-orders",
        icon: Package,
      },
      {
        name: "Job Orders",
        href: "/job-orders",
        icon: Settings,
      },
    ],
  },
  {
    name: "Challans",
    items: [
      {
        name: "Sales Challan",
        href: "/sales-challans",
        icon: Truck,
      },
    ],
  },
  {
    name: "Master Data",
    items: [
      {
        name: "Categories",
        href: "/categories",
        icon: FolderOpen,
      },
      {
        name: "Products",
        href: "/products",
        icon: Package,
      },

      {
        name: "Warehouses",
        href: "/warehouses",
        icon: Building,
      },
      {
        name: "Customers",
        href: "/customers",
        icon: Users,
      },
      {
        name: "Suppliers",
        href: "/suppliers",
        icon: Factory,
      },
      {
        name: "Processors",
        href: "/processors",
        icon: Settings,
      },
    ],
  },
  {
    name: "User Management",
    items: [
      {
        name: "Users & Roles",
        href: "/user-management",
        icon: Users,
      },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await authApi.logout();
  };

  const isCurrentPath = (href: string) => {
    if (href === "/dashboard" && location === "/") return true;
    return location === href || location.startsWith(href + "/");
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={cn(
      "bg-sidebar-background shadow-material border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-80"
    )}>
      {/* Logo and Brand */}
      <div className={cn("border-b border-sidebar-border", isCollapsed ? "p-3" : "p-6")}>
        <div className={cn(
          "flex items-center",
          isCollapsed ? "flex-col space-y-2" : "justify-between"
        )}>
          {/* Logo and brand text */}
          <div className={cn(
            "flex items-center",
            isCollapsed ? "flex-col space-y-2" : "space-x-3"
          )}>
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Package className="text-primary-foreground text-lg" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-semibold text-sidebar-foreground">YarnFlow</h1>
                <p className="text-sm text-sidebar-foreground/60">Inventory Management</p>
              </div>
            )}
          </div>
          
          {/* Toggle button - always visible */}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors flex-shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-sidebar-border bg-sidebar-accent/30">
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">
              {(user as any)?.fullName?.charAt(0) || (user as any)?.username?.charAt(0) || "U"}
            </span>
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium text-sidebar-foreground">
                  {(user as any)?.fullName || (user as any)?.username || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {(user as any)?.role?.name || "Stock Manager"}
                </p>
              </div>
              <Link href="/settings" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
                <Settings className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {/* Dashboard Link */}
          <Link 
            href="/dashboard"
            className={cn(
              "nav-item",
              isCurrentPath("/dashboard") || location === "/"
                ? "nav-item-active"
                : "nav-item-inactive",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <Home className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Dashboard"}
          </Link>

          {/* Navigation Groups */}
          {navigation.slice(1).map((group) => {
            // Hide User Management for non-Admin users
            if (group.name === "User Management" && (user as any)?.role?.name !== 'Admin') {
              return null;
            }
            
            return (
              <div key={group.name} className={cn("pt-4", isCollapsed && "pt-2")}>
                {!isCollapsed && (
                  <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider mb-2">
                    {group.name}
                  </p>
                )}
                {group.items?.map((item) => (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={cn(
                      "nav-item",
                      isCurrentPath(item.href)
                        ? "nav-item-active"
                        : "nav-item-inactive",
                      isCollapsed && "justify-center"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
                    {!isCollapsed && item.name}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center w-full px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
