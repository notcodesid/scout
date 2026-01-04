import { ExternalLink, Linkedin, Users, Building2, Bookmark, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useState } from "react";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { cn } from "@/lib/utils";

export interface Startup {
  id: string;
  name: string;
  description: string;
  website: string;
  tags: string[];
  founded: string;
  teamSize: number;
  location: string;
  founders: { name: string; linkedin?: string }[];
  batch?: string;
  logoUrl?: string;
  isHiring?: boolean;
}

interface StartupCardProps {
  startup: Startup;
  index: number;
}

const StartupCard = ({ startup, index }: StartupCardProps) => {
  const [logoError, setLogoError] = useState(false);
  const { isBookmarked, toggleBookmark, loading } = useBookmarks();

  return (
    <article
      className="clean-card group relative p-6 animate-fade-in"
      style={{
        animationDelay: `${index * 0.04}s`,
      }}
    >
      <div className="relative">
        {/* Header with Logo */}
        <div className="mb-4 flex items-start gap-4">
          {/* Company Logo */}
          <div className="shrink-0">
            {startup.logoUrl && !logoError ? (
              <img
                src={startup.logoUrl}
                alt={`${startup.name} logo`}
                className="h-12 w-12 rounded-xl bg-secondary object-contain p-1.5 border border-border/50"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary border border-border/50">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link 
                  to={`/startup/${startup.id}`}
                  className="font-display text-lg text-foreground transition-colors group-hover:text-foreground/80 block truncate"
                >
                  {startup.name}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {startup.batch && (
                    <Badge variant="secondary" className="text-xs font-medium">
                      {startup.batch}
                    </Badge>
                  )}
                  {startup.isHiring && (
                    <Badge variant="accent" className="text-xs font-medium">
                      Hiring
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-lg",
                    isBookmarked(startup.id) && "text-highlight bg-highlight/10"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleBookmark(startup.id);
                  }}
                  disabled={loading}
                >
                  <Bookmark
                    className={cn(
                      "h-4 w-4 transition-all",
                      isBookmarked(startup.id) && "fill-highlight scale-110"
                    )}
                  />
                </Button>
                <a
                  href={startup.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-all duration-200 hover:bg-foreground hover:text-background"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <Link to={`/startup/${startup.id}`}>
          <p className="mb-4 line-clamp-3 text-body-sm leading-relaxed text-muted-foreground">
            {startup.description}
          </p>
        </Link>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {startup.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs font-normal text-muted-foreground border-border/60">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Meta Info */}
        <div className="mb-4 flex items-center gap-4 text-body-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {startup.teamSize}
          </span>
          <span>Founded: {startup.founded}</span>
          <span className="truncate">{startup.location}</span>
        </div>

        {/* Founders */}
        <div className="border-t border-border/40 pt-4">
          <p className="mb-2.5 text-body-xs font-medium text-muted-foreground">Founders</p>
          <div className="flex flex-wrap gap-2">
            {startup.founders.map((founder) => (
              <a
                key={founder.name}
                href={founder.linkedin || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group/founder flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-body-xs text-foreground transition-all duration-200 hover:bg-foreground hover:text-background"
              >
                <Linkedin className="h-3.5 w-3.5" />
                {founder.name}
              </a>
            ))}
          </div>
        </div>

        {/* View Details Link */}
        <Link 
          to={`/startup/${startup.id}`}
          className="mt-5 flex items-center justify-center gap-2 text-body-sm font-medium text-foreground transition-all duration-200 hover:gap-3 group-hover:text-muted-foreground"
        >
          View Details
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
};

export default StartupCard;
