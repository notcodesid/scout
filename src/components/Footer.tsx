import { Youtube, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/internatyc-logo-minimal.png";

const Footer = () => {
  return (
    <footer className="relative bg-[#0a0a0f] overflow-hidden min-h-[280px]">
      {/* Large Watermark Text - Behind everything */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="font-display text-[14vw] font-bold tracking-tight text-white/[0.04] leading-none whitespace-nowrap">
          InternAtYC
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={logo} 
              alt="InternAtYC" 
              className="h-6 w-auto invert opacity-80" 
            />
          </div>

          {/* Links */}
          <nav className="flex flex-col gap-3">
            <Link
              to="/terms"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Terms & Conditions
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              to="/refund"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Refund & Cancellation
            </Link>
          </nav>

          {/* Social & Copyright */}
          <div className="flex flex-col items-start md:items-end gap-6">
            <div className="flex items-center gap-3">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-700 bg-transparent text-gray-400 transition-all hover:border-gray-500 hover:text-white"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-700 bg-transparent text-gray-400 transition-all hover:border-gray-500 hover:text-white"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-700 bg-transparent text-gray-400 transition-all hover:border-gray-500 hover:text-white"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-700 bg-transparent text-gray-400 transition-all hover:border-gray-500 hover:text-white"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} InternAtYC. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
