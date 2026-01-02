import { ArrowRight, Search, Sparkles, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalStartups?: number;
}

const Hero = ({ searchQuery, onSearchChange, totalStartups }: HeroProps) => {
  const startupCount = totalStartups ? `${totalStartups.toLocaleString()}` : "1,300+";
  
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background Effects */}
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-hero-pattern opacity-30" />
      
      {/* Animated Gradient Orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 animate-pulse-slow rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse-slow rounded-full bg-accent/10 blur-3xl" style={{ animationDelay: "1s" }} />

      <div className="container relative mx-auto px-4 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary animate-fade-in">
          <Sparkles className="h-4 w-4" />
          <span>Explore {startupCount} YC Startups Hiring</span>
        </div>

        {/* Heading */}
        <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Discover the Next
          <span className="text-gradient"> Unicorn</span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Your one-stop database for all Y Combinator startups. Find key details about companies, founders, and funding—all in one place.
        </p>

        {/* Search Bar */}
        <div className="mx-auto mt-10 max-w-2xl animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search companies, founders, or industries..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-14 w-full rounded-xl border-border/50 bg-card/50 pl-12 pr-4 text-base backdrop-blur-sm focus:border-primary/50 focus:bg-card"
            />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <a href="#directory">
            <Button variant="hero" size="lg" className="group">
              Browse Directory
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </a>
          <Link to="/apply">
            <Button variant="glass" size="lg" className="group">
              <Mail className="h-4 w-4" />
              Generate Cold Emails
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          {[
            { value: startupCount, label: "Startups Hiring" },
            { value: "20+", label: "Industries" },
            { value: "5,500+", label: "YC Companies" },
            { value: "$600B+", label: "Total Valuation" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl font-bold text-foreground md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
