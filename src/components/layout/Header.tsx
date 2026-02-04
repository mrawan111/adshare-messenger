import { Link, useLocation } from "react-router-dom";
import { Home, PlusCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Ads", icon: Home },
  { to: "/add-post", label: "Add Post", icon: PlusCircle },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            AdShare
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
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
      </div>
    </header>
  );
}
