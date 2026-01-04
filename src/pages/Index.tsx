import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FilterSidebar from "@/components/FilterSidebar";
import StartupGrid from "@/components/StartupGrid";
import StartupCardSkeleton from "@/components/StartupCardSkeleton";
import ComingSoon from "@/components/ComingSoon";
import Footer from "@/components/Footer";
import { useInfiniteStartups, flattenStartups } from "@/hooks/use-yc-startups";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [filters, setFilters] = useState({
    industry: "all",
    location: "all",
    teamSize: "all",
    founded: "all",
    hiringOnly: true,
  });

  // Fetch live YC startup data with infinite loading
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteStartups("hiring", 50);

  const startups = flattenStartups(data?.pages);
  const totalCount = data?.pages?.[0]?.total || 0;

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredStartups = useMemo(() => {
    let result = [...startups];

    // Hiring filter
    if (filters.hiringOnly) {
      result = result.filter((startup) => startup.isHiring);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (startup) =>
          startup.name.toLowerCase().includes(query) ||
          startup.description.toLowerCase().includes(query) ||
          startup.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Industry filter
    if (filters.industry !== "all") {
      const industryMap: Record<string, string[]> = {
        ai: ["AI", "Machine Learning", "Agents", "Voice AI", "MLOps", "Artificial Intelligence"],
        health: ["Healthcare", "Biotech", "Wearables", "Health", "Medical"],
        devtools: ["Developer Tools", "Infrastructure", "API", "Open Source", "DevOps"],
        fintech: ["Fintech", "Banking", "Finance", "Financial"],
        enterprise: ["Enterprise", "B2B", "SaaS"],
        consumer: ["Consumer"],
        hardware: ["Hardware", "Robotics", "Wearables", "Hard Tech"],
        climate: ["Climate", "Sustainability", "Carbon Capture", "Energy"],
        security: ["Security", "Authentication", "Cybersecurity"],
      };
      const matchTags = industryMap[filters.industry] || [];
      result = result.filter((startup) =>
        startup.tags.some((tag) =>
          matchTags.some((match) =>
            tag.toLowerCase().includes(match.toLowerCase())
          )
        ) || matchTags.some((match) => 
          startup.industry?.toLowerCase().includes(match.toLowerCase())
        )
      );
    }

    // Location filter
    if (filters.location !== "all") {
      const locationMap: Record<string, string[]> = {
        sf: ["San Francisco", "SF", "Bay Area", "California"],
        nyc: ["New York", "NYC"],
        "us-other": ["Boston", "Austin", "Seattle", "Boulder", "Cambridge", "Chicago", "Los Angeles"],
        europe: ["London", "Berlin", "Paris", "United Kingdom", "Germany", "France", "Europe"],
        asia: ["Tokyo", "Singapore", "Hong Kong", "India", "China"],
        remote: ["Remote"],
      };
      const matchLocations = locationMap[filters.location] || [];
      result = result.filter((startup) =>
        matchLocations.some((loc) =>
          startup.location.toLowerCase().includes(loc.toLowerCase())
        )
      );
    }

    // Team size filter
    if (filters.teamSize !== "all") {
      result = result.filter((startup) => {
        if (filters.teamSize === "1-10") return startup.teamSize <= 10;
        if (filters.teamSize === "11-50")
          return startup.teamSize > 10 && startup.teamSize <= 50;
        if (filters.teamSize === "51+") return startup.teamSize > 50;
        return true;
      });
    }

    // Founded filter
    if (filters.founded !== "all") {
      result = result.filter((startup) => startup.founded === filters.founded);
    }

    // Sort
    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "teamSize") {
      result.sort((a, b) => b.teamSize - a.teamSize);
    }
    // 'latest' is default order

    return result;
  }, [startups, searchQuery, sortBy, filters]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <Hero searchQuery={searchQuery} onSearchChange={setSearchQuery} totalStartups={totalCount} />

        {/* Directory Section */}
        <section className="border-t border-border/50 py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-8 lg:flex-row">
              <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />
              
              {isLoading ? (
                <div className="flex-1">
                  <div className="mb-6 flex items-center justify-between">
                    <Skeleton className="h-6 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <StartupCardSkeleton count={9} />
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <div className="text-center">
                    <p className="text-destructive mb-2">Failed to load startups</p>
                    <p className="text-muted-foreground text-sm">{error.message}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <StartupGrid
                    startups={filteredStartups}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    totalCount={totalCount}
                  />
                  
                  {/* Load More Button */}
                  {hasNextPage && (
                    <div className="mt-8 flex justify-center">
                      <Button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        variant="outline"
                        size="lg"
                        className="min-w-[200px]"
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>Load More Startups</>
                        )}
                      </Button>
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          </div>
        </section>

        <ComingSoon />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
