import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, MessageCircle, BarChart3, LogOut, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/i18n";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  // Handle invite click for unauthenticated users
  const handleInviteClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      sessionStorage.setItem("redirectAfterAuth", "/invite");
      navigate("/auth");
    }
  };

  // Build nav items based on role
  const navItems = [
    { to: "/", label: t("nav.ads"), icon: Home, showAlways: true },
    { to: "/invite", label: t("nav.invite"), icon: UserPlus, showAlways: true },
    { to: "/add-post", label: t("nav.addPost"), icon: PlusCircle, adminOnly: true },
    { to: "/whatsapp", label: t("nav.whatsapp"), icon: MessageCircle, adminOnly: true },
    { to: "/analytics", label: t("nav.analytics"), icon: BarChart3, adminOnly: true },
  ].filter((item) => item.showAlways || (item.adminOnly && isAdmin));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden bg-card">
            <img
              src="/logo.png"
              alt={t("appName")}
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.src = "/favicon.ico";
              }}
            />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            {t("appName")}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={to === "/invite" ? handleInviteClick : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  location.pathname === to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? t("nav.admin") : t("nav.user")}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="ml-2 h-4 w-4" />
                  الملف الشخصي
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="ml-2 h-4 w-4" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm">
                {t("nav.signIn")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
