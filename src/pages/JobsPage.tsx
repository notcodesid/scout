import { useEffect, useRef, useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JobCard from "@/components/JobCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_YC_JOB_CATEGORY,
  flattenJobs,
  useInfiniteYCJobs,
  useYCJobsSync,
  type YCJobRoleLink,
} from "@/hooks/use-yc-jobs";

const FALLBACK_ROLE_LINKS: YCJobRoleLink[] = [
  { label: "Engineering", path: "/jobs", slug: "software-engineer" },
  { label: "Design", path: "/jobs/l/designer", slug: "designer" },
  { label: "Recruiting", path: "/jobs/l/recruiting", slug: "recruiting" },
  { label: "Science", path: "/jobs/l/science", slug: "science" },
  { label: "Product", path: "/jobs/l/product-manager", slug: "product-manager" },
  { label: "Operations", path: "/jobs/l/operations", slug: "operations" },
  { label: "Sales", path: "/jobs/l/sales-manager", slug: "sales-manager" },
  { label: "Marketing", path: "/jobs/l/marketing", slug: "marketing" },
  { label: "Legal", path: "/jobs/l/legal", slug: "legal" },
  { label: "Finance", path: "/jobs/l/finance", slug: "finance" },
];

function formatSyncTimestamp(value: string | null) {
  if (!value) {
    return "Fresh YC roles, updated regularly";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Fresh YC roles, updated regularly";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

const JobsPage = () => {
  const [category, setCategory] = useState(DEFAULT_YC_JOB_CATEGORY);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteYCJobs(category);
  const {
    mutateAsync: refreshJobs,
    isPending: isRefreshing,
    error: refreshError,
  } = useYCJobsSync();
  const bootstrappedSyncRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const jobs = flattenJobs(data?.pages);
  const firstPage = data?.pages[0];
  const roleLinks = firstPage?.roleLinks?.length ? firstPage.roleLinks : FALLBACK_ROLE_LINKS;
  const loadedJobsCount = jobs.length;
  const syncMessage = firstPage?.lastSyncedAt
    ? `Updated ${formatSyncTimestamp(firstPage.lastSyncedAt)}`
    : "Fresh YC roles, updated regularly.";
  const displayError =
    error instanceof Error
      ? error.message
      : refreshError instanceof Error
        ? refreshError.message
        : "The YC jobs cache did not load.";

  async function handleRefresh(force: boolean) {
    try {
      await refreshJobs({ force });
      await refetch();
    } catch {
      // The mutation state already carries the error for the UI.
    }
  }

  useEffect(() => {
    if (!firstPage?.needsSync || bootstrappedSyncRef.current) {
      return;
    }

    bootstrappedSyncRef.current = true;
    void handleRefresh(false);
  }, [firstPage?.needsSync]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting || isFetchingNextPage) {
          return;
        }

        void fetchNextPage();
      },
      {
        rootMargin: "500px 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, jobs.length]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-10 md:py-14">
        <section className="mb-10">
          <Badge variant="accent" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
            Official YC Jobs
          </Badge>
          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Discover live roles from YC startups
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Explore current openings from the official Work at a Startup board, grouped by role so you can move faster.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {syncMessage}
                {firstPage?.isStale ? " Showing the latest available Scout snapshot while we refresh." : ""}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card px-5 py-4">
              <p className="text-sm text-muted-foreground">Showing</p>
              <p className="font-display text-2xl font-semibold text-foreground">
                {loadedJobsCount} roles
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-full"
                onClick={() => void handleRefresh(true)}
                disabled={isRefreshing || firstPage?.syncStatus === "running"}
              >
                {isRefreshing || firstPage?.syncStatus === "running" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  "Refresh Jobs"
                )}
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-8 flex flex-wrap gap-2">
          {roleLinks.map((role) => (
            <Button
              key={role.slug}
              variant={role.slug === category ? "secondary" : "outline"}
              className="rounded-full"
              onClick={() => setCategory(role.slug)}
            >
              {role.label}
            </Button>
          ))}
        </section>

        {isLoading && jobs.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {firstPage?.needsSync && isRefreshing && jobs.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold">Syncing YC jobs</h2>
            <p className="mt-3 text-muted-foreground">
              Pulling the latest roles into Scout&apos;s cache for the first load.
            </p>
          </div>
        )}

        {(isError || refreshError) && jobs.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <Briefcase className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold">Failed to load jobs</h2>
            <p className="mt-3 text-muted-foreground">
              {displayError}
            </p>
            <Button
              variant="outline"
              className="mt-6 rounded-full"
              onClick={() => void handleRefresh(true)}
              disabled={isRefreshing}
            >
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && !refreshError && jobs.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card p-10 text-center">
            <h2 className="font-display text-2xl font-semibold">
              {firstPage?.needsSync ? "Jobs cache is empty" : "No jobs found"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {firstPage?.needsSync
                ? "Run a refresh to import the official YC jobs into the cache."
                : "This role category currently has no jobs in the cached YC feed."}
            </p>
            {firstPage?.needsSync && (
              <Button
                variant="outline"
                className="mt-6 rounded-full"
                onClick={() => void handleRefresh(true)}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  "Import YC Jobs"
                )}
              </Button>
            )}
          </div>
        )}

        {jobs.length > 0 && (
          <>
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job, index) => (
                <JobCard key={`${job.id}-${job.companySlug}`} job={job} index={index} />
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
