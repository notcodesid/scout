import { Link } from "react-router-dom";
import founderHqLogo from "@/assets/internatyc-icon-abstract.png";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img 
            src={founderHqLogo} 
            alt="FounderHQ" 
            className="h-8 w-8 rounded-lg"
          />
          <span className="font-display text-xl tracking-tight">FounderHQ</span>
        </Link>
      </div>
    </header>
  );
};

export default Header;
