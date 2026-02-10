import { useState } from "react";
import { Search } from "lucide-react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeatureShowcase from "@/components/FeatureShowcase";
import Footer from "@/components/Footer";
import StartupGrid from "@/components/StartupGrid";
import FilterSidebar from "@/components/FilterSidebar";
import { useInfiniteStartups, flattenStartups } from "@/hooks/use-yc-startups";
import { Input } from "@/components/ui/input";
import FeatureEmailPreview from "@/components/FeatureEmailPreview";

const Index = () => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [filters, setFilters] = useState({
    industry: "all",
    location: "all",
    teamSize: "all",
    founded: "all",
    hiringOnly: true,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteStartups({
    search,
    industry: filters.industry !== "all" ? filters.industry : undefined,
    category: filters.hiringOnly ? "hiring" : "all",
  });

  const startups = flattenStartups(data?.pages);
  const totalCount = data?.pages[0]?.total;

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <Hero />
        <FeatureEmailPreview />
        <FeatureShowcase />

        {/* Directory Section */}
        <section className="container mx-auto px-4 py-12 lg:py-20" id="directory">
          <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Explore Startups
              </h2>
              <p className="mt-2 text-muted-foreground">
                Discover YC companies hiring now
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search startups, roles, stacks..."
                className="pl-10 h-11 rounded-full bg-card border-border/60 focus:border-primary/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />

            <StartupGrid
              startups={startups}
              sortBy={sortBy}
              onSortChange={setSortBy}
              totalCount={totalCount}
              isLoading={isLoading}
              hasMore={hasNextPage}
              onLoadMore={() => fetchNextPage()}
              isLoadingMore={isFetchingNextPage}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
