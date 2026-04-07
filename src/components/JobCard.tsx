import { ArrowUpRight, Building2, MapPin, TrendingUp, Wifi } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { type Job } from "@/hooks/use-jobs";
import { useState } from "react";

interface JobCardProps {
  job: Job;
  index: number;
}

const SOURCE_LABELS: Record<string, string> = {
  yc: "YC",
  wellfound: "Wellfound",
  indeed: "Indeed",
  naukri: "Naukri",
  glassdoor: "Glassdoor",
  hn: "HN",
  remoteok: "RemoteOK",
  internshala: "Internshala",
  cutshort: "Cutshort",
  linkedin: "LinkedIn",
};

const SOURCE_COLORS: Record<string, "accent" | "secondary" | "outline" | "default"> = {
  yc: "accent",
  wellfound: "secondary",
  remoteok: "accent",
  hn: "secondary",
  internshala: "outline",
  naukri: "secondary",
  cutshort: "accent",
};

function formatSalary(min: number | null, max: number | null, currency: string): string {
  if (!min && !max) return "";
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toString();
  const curr = currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  if (min && max) return `${curr}${fmt(min)}–${curr}${fmt(max)}`;
  if (min) return `From ${curr}${fmt(min)}`;
  if (max) return `Up to ${curr}${fmt(max)}`;
  return "";
}

const JobCard = ({ job, index }: JobCardProps) => {
  const [logoError, setLogoError] = useState(false);

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const sourceLabel = SOURCE_LABELS[job.source] || job.sourceLabel || job.source;
  const sourceVariant = SOURCE_COLORS[job.source] || "outline";

  return (
    <article
      className="clean-card group relative flex h-full flex-col p-6 animate-fade-in"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="flex items-start gap-4">
        {job.companyLogoUrl && !logoError ? (
          <img
            src={job.companyLogoUrl}
            alt={`${job.companyName} logo`}
            className="h-12 w-12 rounded-xl border border-border/50 bg-secondary object-contain p-1.5"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-secondary">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{job.companyName}</p>
              <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
                {job.title}
              </h3>
            </div>
            <Badge variant={sourceVariant} className="shrink-0 text-xs font-medium">
              {sourceLabel}
            </Badge>
          </div>

          {job.companyOneLiner && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {job.companyOneLiner}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {job.seniority && <Badge variant="secondary">{job.seniority}</Badge>}
        <Badge variant="outline">{job.jobType}</Badge>
        {job.remote === "Remote" && (
          <Badge variant="accent" className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            Remote
          </Badge>
        )}
        {job.remote === "Hybrid" && (
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Hybrid
          </Badge>
        )}
        {salary && <Badge variant="tag">{salary}</Badge>}
        {job.category && job.source !== job.category && (
          <Badge variant="tag">{job.category}</Badge>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{job.location || "Location not specified"}</span>
        </p>
        {job.skills.length > 0 && (
          <p className="line-clamp-1 flex flex-wrap gap-1">
            <span className="shrink-0">{job.skills.slice(0, 4).join(", ")}</span>
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="rounded-full">
          <a href={job.jobUrl} target="_blank" rel="noopener noreferrer">
            View Role
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
            Apply
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </article>
  );
};

export default JobCard;
