import { Youtube, Twitter, Instagram, Linkedin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import founderHqLogo from "@/assets/internatyc-icon-abstract.png";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-footer text-footer-foreground">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-footer via-footer to-transparent pointer-events-none" />
      
      <div className="relative border-t border-footer-border/50">
        <div className="container mx-auto px-6 py-14">
          <div className="grid gap-12 md:grid-cols-[auto_1fr_auto] md:items-center">
            {/* left: brand + tagline */}
            <div className="flex flex-col gap-3">
              <Link to="/" className="group inline-flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/30 to-accent/20 opacity-0 blur transition-opacity duration-300 group-hover:opacity-100" />
                  <img 
                    src={founderHqLogo} 
                    alt="FounderHQ" 
                    className="relative h-10 w-10 rounded-xl"
                  />
                </div>
                <span className="font-display text-xl font-semibold tracking-tight">FounderHQ</span>
              </Link>
              <p className="text-body-sm text-footer-muted max-w-[220px]">
                Your launchpad to tech careers
              </p>
            </div>

            {/* center: links */}
            <nav
              aria-label="Footer"
              className="flex flex-col gap-4 md:flex-row md:items-center md:justify-center md:gap-10"
            >
              <Link
                to="/terms"
                className="text-body-sm text-footer-muted transition-all duration-200 hover:text-footer-foreground hover:translate-x-0.5"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                to="/privacy"
                className="text-body-sm text-footer-muted transition-all duration-200 hover:text-footer-foreground hover:translate-x-0.5"
              >
                Privacy Policy
              </Link>
              <Link
                to="/refund"
                className="text-body-sm text-footer-muted transition-all duration-200 hover:text-footer-foreground hover:translate-x-0.5"
              >
                Refund &amp; Cancellation
              </Link>
            </nav>

            {/* right: socials */}
            <div className="flex flex-col gap-6 md:items-end">
              <div className="flex items-center gap-2">
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="FounderHQ on YouTube"
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-xl border border-footer-border/60 bg-footer-border/10 text-footer-muted transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:scale-105"
                >
                  <Youtube className="h-5 w-5 transition-transform group-hover:scale-110" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="FounderHQ on X"
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-xl border border-footer-border/60 bg-footer-border/10 text-footer-muted transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:scale-105"
                >
                  <Twitter className="h-5 w-5 transition-transform group-hover:scale-110" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="FounderHQ on Instagram"
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-xl border border-footer-border/60 bg-footer-border/10 text-footer-muted transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:scale-105"
                >
                  <Instagram className="h-5 w-5 transition-transform group-hover:scale-110" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="FounderHQ on LinkedIn"
                  className="group inline-flex h-11 w-11 items-center justify-center rounded-xl border border-footer-border/60 bg-footer-border/10 text-footer-muted transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:scale-105"
                >
                  <Linkedin className="h-5 w-5 transition-transform group-hover:scale-110" />
                </a>
              </div>

              <p className="text-body-sm text-footer-muted">
                © {year} FounderHQ · Built with <Sparkles className="inline h-3.5 w-3.5 text-primary" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
