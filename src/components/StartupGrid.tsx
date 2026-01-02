import { ArrowUpDown } from "lucide-react";
import StartupCard, { Startup } from "./StartupCard";
import { Button } from "./ui/button";

interface StartupGridProps {
  startups: Startup[];
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalCount?: number;
}

const StartupGrid = ({ startups, sortBy, onSortChange, totalCount }: StartupGridProps) => {
  const sortOptions = [
    { value: "latest", label: "Latest" },
    { value: "name", label: "Name" },
    { value: "teamSize", label: "Team Size" },
  ];

  const displayCount = totalCount !== undefined 
    ? `${startups.length} of ${totalCount}` 
    : startups.length.toString();

  return (
    <section className="flex-1" id="directory">
      {/* Sort Controls */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{displayCount}</span> startups
        </p>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={sortBy === option.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onSortChange(option.value)}
              className="h-8"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {startups.map((startup, index) => (
          <StartupCard key={startup.id} startup={startup} index={index} />
        ))}
      </div>

      {/* Empty State */}
      {startups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
            <span className="text-3xl">🔍</span>
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground">No startups found</h3>
          <p className="mt-2 text-muted-foreground">Try adjusting your filters or search query</p>
        </div>
      )}
    </section>
  );
};

export default StartupGrid;
