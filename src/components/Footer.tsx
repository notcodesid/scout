import { Youtube, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-6 py-14">
        <div className="grid gap-12 md:grid-cols-[auto_1fr_auto] md:items-center">
          {/* Left: Brand + Tagline */}
          <div className="flex flex-col gap-3">
            <Link to="/" className="inline-flex items-center">
              <span className="font-display text-xl tracking-tight">FounderHQ</span>
            </Link>
            <p className="text-body-sm text-muted-foreground max-w-[220px]">
              Your launchpad to tech careers
            </p>
          </div>

          {/* Center: Links */}
          <nav
            aria-label="Footer"
            className="flex flex-col gap-4 md:flex-row md:items-center md:justify-center md:gap-10"
          >
            <Link
              to="/terms"
              className="text-body-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              to="/privacy"
              className="text-body-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              to="/refund"
              className="text-body-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Refund &amp; Cancellation
            </Link>
          </nav>

          {/* Right: Socials */}
          <div className="flex flex-col gap-6 md:items-end">
            <div className="flex items-center gap-2">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FounderHQ on YouTube"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-200 hover:border-foreground/40 hover:text-foreground"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FounderHQ on X"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-200 hover:border-foreground/40 hover:text-foreground"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FounderHQ on Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-200 hover:border-foreground/40 hover:text-foreground"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FounderHQ on LinkedIn"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all duration-200 hover:border-foreground/40 hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>

            <p className="text-body-sm text-muted-foreground">
              © {year} FounderHQ
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
