import { ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalStartups?: number;
}
const Hero = ({
  searchQuery,
  onSearchChange,
  totalStartups
}: HeroProps) => {
  const startupCount = totalStartups ? `${totalStartups.toLocaleString()}` : "1,300+";
  return <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Background Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-50" />
      
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/98 to-background" />

      
    </section>;
};
export default Hero;