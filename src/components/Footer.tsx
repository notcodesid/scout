import { Youtube, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/internatyc-logo-minimal.png";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-footer text-footer-foreground">

      <div className="relative border-t border-footer-border/70">
        <div className="container mx-auto px-6 py-12">
          <div className="grid gap-10 md:grid-cols-[auto_1fr_auto] md:items-center">
            {/* left: brand */}
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={logo}
                alt="InternAtYC logo"
                className="h-6 w-auto opacity-90 invert dark:invert-0"
                loading="lazy"
              />
              <span className="font-display text-base tracking-tight">InternAtYC</span>
            </Link>

            {/* center: links */}
            <nav
              aria-label="Footer"
              className="flex flex-col gap-3 md:flex-row md:items-center md:justify-center md:gap-8"
            >
              <Link
                to="/terms"
                className="text-sm text-footer-muted transition-colors hover:text-footer-foreground"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                to="/privacy"
                className="text-sm text-footer-muted transition-colors hover:text-footer-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                to="/refund"
                className="text-sm text-footer-muted transition-colors hover:text-footer-foreground"
              >
                Refund &amp; Cancellation
              </Link>
            </nav>

            {/* right: socials */}
            <div className="flex flex-col gap-5 md:items-end">
              <div className="flex items-center gap-3">
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="InternAtYC on YouTube"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-footer-border bg-transparent text-footer-muted transition-colors hover:text-footer-foreground"
                >
                  <Youtube className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="InternAtYC on X"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-footer-border bg-transparent text-footer-muted transition-colors hover:text-footer-foreground"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="InternAtYC on Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-footer-border bg-transparent text-footer-muted transition-colors hover:text-footer-foreground"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="InternAtYC on LinkedIn"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-footer-border bg-transparent text-footer-muted transition-colors hover:text-footer-foreground"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>

              <p className="text-sm text-footer-muted">© {year} InternAtYC</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

