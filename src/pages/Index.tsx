import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FilterSidebar from "@/components/FilterSidebar";
import StartupGrid from "@/components/StartupGrid";
import ComingSoon from "@/components/ComingSoon";
import Footer from "@/components/Footer";
import { startups } from "@/data/startups";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [filters, setFilters] = useState({
    industry: "all",
    location: "all",
    teamSize: "all",
    founded: "all",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredStartups = useMemo(() => {
    let result = [...startups];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (startup) =>
          startup.name.toLowerCase().includes(query) ||
          startup.description.toLowerCase().includes(query) ||
          startup.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          startup.founders.some((founder) =>
            founder.name.toLowerCase().includes(query)
          )
      );
    }

    // Industry filter
    if (filters.industry !== "all") {
      const industryMap: Record<string, string[]> = {
        ai: ["AI", "Machine Learning", "Agents", "Voice AI", "MLOps"],
        health: ["Healthcare", "Biotech", "Wearables"],
        devtools: ["Developer Tools", "Infrastructure", "API", "Open Source"],
        fintech: ["Fintech", "Banking"],
        enterprise: ["Enterprise", "B2B", "SaaS"],
        consumer: ["Consumer"],
        hardware: ["Hardware", "Robotics", "Wearables"],
        climate: ["Climate", "Sustainability", "Carbon Capture"],
        security: ["Security", "Authentication"],
      };
      const matchTags = industryMap[filters.industry] || [];
      result = result.filter((startup) =>
        startup.tags.some((tag) =>
          matchTags.some((match) =>
            tag.toLowerCase().includes(match.toLowerCase())
          )
        )
      );
    }

    // Location filter
    if (filters.location !== "all") {
      const locationMap: Record<string, string[]> = {
        sf: ["San Francisco", "SF", "Bay Area"],
        nyc: ["New York", "NYC"],
        "us-other": ["Boston", "Austin", "Seattle", "Boulder", "Cambridge"],
        europe: ["London", "Berlin", "Paris"],
        asia: ["Tokyo", "Singapore", "Hong Kong"],
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
  }, [searchQuery, sortBy, filters]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <Hero searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Directory Section */}
        <section className="border-t border-border/50 py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-8 lg:flex-row">
              <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />
              <StartupGrid
                startups={filteredStartups}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
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
