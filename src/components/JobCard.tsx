import { ArrowUpRight, Briefcase, Building2, Clock3, MapPin } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { YCJob } from "@/hooks/use-yc-jobs";
import { useState } from "react";

interface JobCardProps {
  job: YCJob;
  index: number;
}

const JobCard = ({ job, index }: JobCardProps) => {
  const [logoError, setLogoError] = useState(false);

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
            {job.companyBatch && (
              <Badge variant="secondary" className="shrink-0 text-xs font-medium">
                {job.companyBatch}
              </Badge>
            )}
          </div>

          {job.companyOneLiner && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {job.companyOneLiner}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="accent">{job.roleType}</Badge>
        <Badge variant="outline">{job.jobType}</Badge>
        {job.companyLastActiveAt && <Badge variant="tag">Active {job.companyLastActiveAt}</Badge>}
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{job.location}</span>
        </p>
        <p className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span>{job.companyName}</span>
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          <span>Official YC listing</span>
        </p>
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
            Apply on YC
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </article>
  );
};

export default JobCard;
