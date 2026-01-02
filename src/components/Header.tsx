import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import logo from "@/assets/internatyc-logo.png";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="InternAtYC" className="h-10 w-auto" />
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
          <Link to="/apply">
            <Button variant="hero" size="sm">
              Get Emails
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
