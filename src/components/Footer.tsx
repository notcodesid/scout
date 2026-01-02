import { Github, Rocket, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-card/30 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              YCatalyst
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6">
            <a
              href="#directory"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Directory
            </a>
            <a
              href="#about"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </a>
            <a
              href="#coming-soon"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Coming Soon
            </a>
          </nav>

          {/* Social */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-border/50 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} YCatalyst. Not affiliated with Y Combinator.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
