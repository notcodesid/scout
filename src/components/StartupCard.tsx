import { ExternalLink, Linkedin, Users, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { useState } from "react";

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
}

interface StartupCardProps {
  startup: Startup;
  index: number;
}

const StartupCard = ({ startup, index }: StartupCardProps) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <article
      className="glass-card group relative overflow-hidden p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      style={{
        animationDelay: `${index * 0.05}s`,
      }}
    >
      {/* Hover Glow Effect */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -inset-px bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
      </div>

      <div className="relative">
        {/* Header with Logo */}
        <div className="mb-3 flex items-start gap-3">
          {/* Company Logo */}
          <div className="shrink-0">
            {startup.logoUrl && !logoError ? (
              <img
                src={startup.logoUrl}
                alt={`${startup.name} logo`}
                className="h-10 w-10 rounded-lg bg-white/10 object-contain p-1"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link 
                  to={`/startup/${startup.id}`}
                  className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary hover:underline block truncate"
                >
                  {startup.name}
                </Link>
                {startup.batch && (
                  <Badge variant="accent" className="mt-1">
                    {startup.batch}
                  </Badge>
                )}
              </div>
              <a
                href={startup.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Description */}
        <Link to={`/startup/${startup.id}`}>
          <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground hover:text-foreground transition-colors">
            {startup.description}
          </p>
        </Link>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {startup.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="tag">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Meta Info */}
        <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {startup.teamSize}
          </span>
          <span>Founded: {startup.founded}</span>
          <span>{startup.location}</span>
        </div>

        {/* Founders */}
        <div className="border-t border-border/50 pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Founders</p>
          <div className="flex flex-wrap gap-2">
            {startup.founders.map((founder) => (
              <a
                key={founder.name}
                href={founder.linkedin || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-md bg-secondary/50 px-2 py-1 text-xs text-foreground transition-colors hover:bg-secondary hover:text-primary"
              >
                <Linkedin className="h-3 w-3" />
                {founder.name}
              </a>
            ))}
          </div>
        </div>

        {/* View Details Link */}
        <Link 
          to={`/startup/${startup.id}`}
          className="mt-4 block text-center text-sm font-medium text-primary hover:underline"
        >
          View Details →
        </Link>
      </div>
    </article>
  );
};

export default StartupCard;
