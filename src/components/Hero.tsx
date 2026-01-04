import { ArrowRight, Search, Sparkles, Mail, Briefcase, Zap } from "lucide-react";
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
    <section className="relative overflow-hidden py-24 md:py-36 lg:py-44">
      {/* Background Effects */}
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="hero-mesh pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-hero-pattern opacity-40" />
      
      {/* Animated Gradient Orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-[500px] w-[500px] animate-pulse-slow rounded-full bg-primary/8 blur-[100px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-[400px] w-[400px] animate-pulse-slow rounded-full bg-accent/6 blur-[80px]" style={{ animationDelay: "2s" }} />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 animate-pulse-slow rounded-full bg-primary/5 blur-[120px]" style={{ animationDelay: "1s" }} />

      <div className="container relative mx-auto px-4 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-success/20 bg-success/10 px-5 py-2 text-sm font-medium text-success animate-fade-in">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
          </div>
          <span>{startupCount} Tech Companies Actively Hiring</span>
        </div>

        {/* Heading */}
        <h1 className="mx-auto max-w-5xl font-display text-display-md md:text-display-lg lg:text-display-xl font-bold tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Launch Your
          <span className="text-gradient"> Tech Career</span>
          <br className="hidden sm:block" />
          <span className="text-muted-foreground/80"> with AI</span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-8 max-w-2xl text-body-lg text-muted-foreground md:text-body-xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Generate personalized cold emails to tech founders. Upload your resume, pick your target companies, and get AI-crafted outreach that gets responses.
        </p>

        {/* CTA Buttons */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Link to="/apply">
            <Button variant="hero" size="lg" className="group gap-3 px-8">
              <Zap className="h-5 w-5" />
              <span>Generate Cold Emails</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href="#directory">
            <Button variant="glass" size="lg" className="group gap-3 px-8">
              <Search className="h-5 w-5" />
              <span>Browse Companies</span>
            </Button>
          </a>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-12 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {[
            { value: startupCount, label: "Companies Hiring" },
            { value: "AI-Powered", label: "Email Generation" },
            { value: "Free", label: "To Get Started" },
            { value: "2x", label: "Response Rate" },
          ].map((stat, index) => (
            <div 
              key={stat.label} 
              className="group relative text-center"
              style={{ animationDelay: `${0.4 + index * 0.1}s` }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative font-display text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-body-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Directory Search */}
        <div className="mt-24 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="glass-card mx-auto max-w-3xl p-8 md:p-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-semibold">
                Explore the Company Directory
              </h2>
            </div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search companies, industries, or locations..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-14 w-full rounded-xl border-border/50 bg-background/50 pl-14 pr-5 text-body-md backdrop-blur-sm transition-all duration-300 focus:border-primary/50 focus:bg-background focus:shadow-lg focus:shadow-primary/5"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
