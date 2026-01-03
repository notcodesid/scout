import { Youtube, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/internatyc-logo-minimal.png";

const Footer = () => {
  return (
    <footer className="relative border-t border-border/50 bg-background overflow-hidden py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-start">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={logo} 
              alt="InternAtYC" 
              className="h-8 w-auto dark:invert" 
            />
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-3">
            <Link
              to="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms & Conditions
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              to="/refund"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Refund & Cancellation
            </Link>
          </nav>

          {/* Social & Copyright */}
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-3">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} InternAtYC. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Large Watermark Text */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center overflow-hidden pointer-events-none select-none">
        <span className="font-display text-[12vw] font-bold tracking-tighter text-muted-foreground/10 leading-none translate-y-[30%]">
          InternAtYC
        </span>
      </div>
    </footer>
  );
};

export default Footer;
