import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link to="/" className="inline-flex items-center">
            <span className="font-display text-2xl font-semibold tracking-tight">Scout</span>
          </Link>
        </div>

        {/* 404 Display */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            404
          </h1>
        </div>

        <h2 className="mb-3 text-2xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Navigation Links */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button asChild size="lg">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/#directory">
              <Compass className="mr-2 h-4 w-4" />
              Explore Startups
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">Quick links</p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link to="/" className="text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Home
            </Link>
            <Link to="/apply" className="text-primary hover:underline">
              Apply as Engineer
            </Link>
            <Link to="/terms" className="text-primary hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
