import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import founderHqLogo from "@/assets/internatyc-icon-abstract.png";
const Header = () => {
  return <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          
          <span className="font-display text-xl tracking-tight">founderHQ</span>
        </Link>

        {/* CTA Button */}
        <Link to="/auth">
          <Button variant="default" size="sm" className="rounded-full px-5 gap-2">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </header>;
};
export default Header;