import { Link } from "react-router-dom";
import { Briefcase, Loader2 } from "lucide-react";
import JobCard from "@/components/JobCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useJobs } from "@/hooks/use-jobs";

const PREVIEW_COUNT = 6;

const JobsPreviewSection = () => {
  const { data, isLoading, isError, error, refetch } = useInfiniteQuery({
    ...useJobs({ sources: ["yc", "wellfound", "remoteok", "hn"], limit: PREVIEW_COUNT }),
    initialPageParam: 0,
    getNextPageParam: () => undefined,
  });

  const jobs = data?.pages.flatMap((p) => p.jobs).slice(0, PREVIEW_COUNT) ?? [];

  return (
    <section id="jobs-preview" className="bg-background">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <Badge variant="accent" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Jobs from Multiple Sources
            </Badge>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Browse roles from one cleaner feed
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              YC, Wellfound, Indeed, LinkedIn, Remote OK, and more, without the usual tab-hopping.
            </p>
          </div>

          <Button asChild size="lg" className="rounded-full">
            <Link to="/jobs">View All Jobs</Link>
          </Button>
        </div>

        {isLoading && jobs.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && jobs.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <Briefcase className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="mt-5 font-display text-2xl font-semibold">Failed to load jobs</h3>
            <p className="mt-3 text-muted-foreground">
              {error instanceof Error ? error.message : "Could not load jobs preview."}
            </p>
            <Button variant="outline" className="mt-6 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job, index) => (
              <JobCard key={`${job.id}-${job.source}`} job={job} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default JobsPreviewSection;
