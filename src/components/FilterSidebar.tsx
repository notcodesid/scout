import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface FilterSection {
  title: string;
  options: { value: string; label: string; count?: number }[];
}

interface FilterSidebarProps {
  filters: {
    industry: string;
    location: string;
    teamSize: string;
    founded: string;
    hiringOnly: boolean;
  };
  onFilterChange: (key: string, value: string | boolean) => void;
}

const filterSections: FilterSection[] = [
  {
    title: "Industry",
    options: [
      { value: "all", label: "All Industries" },
      { value: "ai", label: "AI & Machine Learning" },
      { value: "health", label: "Health & Biotech" },
      { value: "devtools", label: "Developer Tools" },
      { value: "fintech", label: "Finance & Fintech" },
      { value: "enterprise", label: "Enterprise & B2B" },
      { value: "consumer", label: "Consumer" },
      { value: "hardware", label: "Hardware & Robotics" },
      { value: "climate", label: "Climate & Energy" },
      { value: "security", label: "Security" },
    ],
  },
  {
    title: "Location",
    options: [
      { value: "all", label: "All Locations" },
      { value: "sf", label: "San Francisco Bay Area" },
      { value: "nyc", label: "New York" },
      { value: "us-other", label: "Other US Cities" },
      { value: "europe", label: "Europe" },
      { value: "asia", label: "Asia" },
      { value: "remote", label: "Remote" },
    ],
  },
  {
    title: "Team Size",
    options: [
      { value: "all", label: "All Sizes" },
      { value: "1-10", label: "1-10 employees" },
      { value: "11-50", label: "11-50 employees" },
      { value: "51+", label: "51+ employees" },
    ],
  },
  {
    title: "Founded",
    options: [
      { value: "all", label: "All Years" },
      { value: "2025", label: "2025" },
      { value: "2024", label: "2024" },
      { value: "2023", label: "2023" },
      { value: "2022", label: "2022" },
      { value: "2021", label: "2021" },
    ],
  },
];

const FilterSidebar = ({ filters, onFilterChange }: FilterSidebarProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    filterSections.map((s) => s.title)
  );

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const getFilterKey = (title: string): keyof typeof filters => {
    const keyMap: Record<string, keyof typeof filters> = {
      Industry: "industry",
      Location: "location",
      "Team Size": "teamSize",
      Founded: "founded",
    };
    return keyMap[title] || "industry";
  };

  return (
    <aside className="w-full space-y-1 lg:w-64 lg:shrink-0">
      <div className="glass-card p-4">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Filters
        </h3>

        {/* Hiring Only Toggle */}
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-emerald-400">Hiring Only</span>
          </div>
          <Switch
            checked={filters.hiringOnly}
            onCheckedChange={(checked) => onFilterChange("hiringOnly", checked)}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>

        {filterSections.map((section) => {
          const filterKey = getFilterKey(section.title);
          const isExpanded = expandedSections.includes(section.title);

          return (
            <div key={section.title} className="border-t border-border/50 py-3 first:border-t-0 first:pt-0">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-medium text-foreground">
                  {section.title}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-1">
                  {section.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onFilterChange(filterKey, option.value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                        filters[filterKey] === option.value
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <span>{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-xs opacity-60">{option.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default FilterSidebar;
