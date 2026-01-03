import { Link } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/internatyc-logo-minimal.png";

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="InternAtYC" className="h-10 w-auto dark:invert" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/#directory"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Directory
          </Link>
          <Link
            to="/apply"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cold Emails
          </Link>
          <a
            href="#coming-soon"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/apply">
                <Button variant="hero" size="sm">
                  Get Emails
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="hero" size="sm">
                <User className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
