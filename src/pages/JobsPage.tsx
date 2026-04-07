import { useEffect, useRef, useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JobCard from "@/components/JobCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useJobs, useSyncAllJobs } from "@/hooks/use-jobs";

const SOURCES = ["yc", "wellfound", "indeed", "naukri", "glassdoor", "hn", "remoteok", "internshala", "cutshort", "linkedin"];

const SOURCE_LABELS: Record<string, string> = {
  all: "All Sources",
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

const SOURCE_TARGETS: Record<string, string[]> = {
  discovery: ["indeed", "linkedin"],
  "high-quality": ["wellfound", "yc", "hn", "remoteok"],
  india: ["naukri", "internshala", "cutshort"],
};

function formatSyncTimestamp(value: string | null) {
  if (!value) return "Fresh listings, updated regularly";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Fresh listings, updated regularly";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

const JobsPage = () => {
  const [source, setSource] = useState<string>("all");
  const [remote, setRemote] = useState<string>("all");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const sources = source === "all" ? SOURCES : source in SOURCE_TARGETS ? SOURCE_TARGETS[source] : [source];

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...useJobs({ sources, remote }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
  });

  const { mutateAsync: syncAll, isPending: isSyncing } = useMutation(useSyncAllJobs());

  const jobs = data?.pages.flatMap((p) => p.jobs) ?? [];
  const firstPage = data?.pages[0];
  const loadedJobsCount = jobs.length;
  const totalJobs = firstPage?.total ?? loadedJobsCount;
  const syncMessage = firstPage?.lastSyncedAt
    ? `Updated ${formatSyncTimestamp(firstPage.lastSyncedAt)}`
    : "Fresh listings, updated regularly.";

  async function handleRefresh(force: boolean) {
    try {
      await syncAll({ force });
      await refetch();
    } catch {
      // mutation state carries the error
    }
  }

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || isFetchingNextPage) return;
        void fetchNextPage();
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-10 md:py-14">
        <section className="mb-10">
          <Badge variant="accent" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
            Job Board Aggregator
          </Badge>
          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Jobs from {firstPage?.sources?.length ?? 10} sources
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                YC, Wellfound, Indeed, LinkedIn, Remote OK, and more — all in one place.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {syncMessage}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card px-5 py-4">
              <p className="text-sm text-muted-foreground">Showing</p>
              <p className="font-display text-2xl font-semibold text-foreground">
                {loadedJobsCount} / {totalJobs} roles
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-full"
                onClick={() => void handleRefresh(true)}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Refreshing</>
                ) : (
                  "Refresh All"
                )}
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-wrap gap-3">
          <div className="flex flex-wrap gap-2">
            {["all", "discovery", "high-quality", "india"].map((s) => (
              <Button
                key={s}
                variant={source === s ? "secondary" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setSource(s)}
              >
                {s === "all" ? "All" : s === "high-quality" ? "High Quality" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "Remote", "Hybrid", "On-site"].map((r) => (
              <Button
                key={r}
                variant={remote === r ? "secondary" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setRemote(r)}
              >
                {r === "all" ? "Any Location" : r}
              </Button>
            ))}
          </div>
        </section>

        <section className="mb-4 flex flex-wrap gap-2">
          {firstPage?.sources
            ?.filter((s) => s.is_active && s.totalActiveJobs > 0)
            .sort((a, b) => b.totalActiveJobs - a.totalActiveJobs)
            .map((src) => (
              <Badge key={src.slug} variant="outline" className="text-xs">
                {SOURCE_LABELS[src.slug] || src.slug} ({src.totalActiveJobs})
              </Badge>
            ))}
        </section>

        {isLoading && jobs.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {(isError) && jobs.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <Briefcase className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold">Failed to load jobs</h2>
            <p className="mt-3 text-muted-foreground">
              {error instanceof Error ? error.message : "Could not load jobs."}
            </p>
            <Button variant="outline" className="mt-6 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && jobs.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card p-10 text-center">
            <h2 className="font-display text-2xl font-semibold">No jobs found</h2>
            <p className="mt-3 text-muted-foreground">
              No jobs match the current filters. Try changing the source or remote preference.
            </p>
            <Button
              variant="outline"
              className="mt-6 rounded-full"
              onClick={() => {
                setSource("all");
                setRemote("all");
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}

        {jobs.length > 0 && (
          <>
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job, index) => (
                <JobCard key={`${job.id}-${job.source}`} job={job} index={index} />
              ))}
            </section>

            {(hasNextPage || isFetchingNextPage) && (
              <div ref={loadMoreRef} className="mt-10 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more jobs
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default JobsPage;
