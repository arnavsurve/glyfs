import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../auth/AuthContext";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/app/dashboard",
  },
  {
    id: "agents",
    label: "Agents",
    icon: Bot,
    path: "/app/agents",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    path: "/app/chat",
  },
  // {
  //   id: "metrics",
  //   label: "Metrics",
  //   icon: BarChart3,
  //   path: "/app/metrics",
  // },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/app/settings",
  },
];

export function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      // Small delay to ensure auth state has updated before navigation
      setTimeout(() => {
        navigate("/");
      }, 100);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActiveRoute = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - Full Width */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold">Glyfs</h1>
          </div>

          {/* User Config */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="User avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {(user?.display_name || user?.email)
                    ?.charAt(0)
                    .toUpperCase() || "U"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user?.display_name || user?.email || "User"}
                </span>
                {user?.display_name && (
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content Area - Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${isCollapsed ? "w-16" : "w-52"} transition-all duration-300 bg-card border-r border-border flex flex-col`}
        >
          {/* Sidebar Toggle */}
          <div className="flex items-center justify-center p-4 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="p-2"
            >
              {isCollapsed ? (
                <Menu className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2">
            <div className="space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
