import { Check } from "lucide-react";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

export interface StartupOption {
  id: string;
  name: string;
  description: string;
  tags: string[];
  batch?: string;
  matchScore?: number;
  matchReason?: string;
}

interface StartupSelectorProps {
  startups: StartupOption[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection?: number;
}

const StartupSelector = ({
  startups,
  selectedIds,
  onSelectionChange,
  maxSelection = 5,
}: StartupSelectorProps) => {
  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < maxSelection) {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select up to {maxSelection} startups to reach out to
        </p>
        <Badge variant="accent">
          {selectedIds.length}/{maxSelection} selected
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {startups.map((startup) => {
          const isSelected = selectedIds.includes(startup.id);
          const isDisabled = !isSelected && selectedIds.length >= maxSelection;

          return (
            <button
              key={startup.id}
              type="button"
              onClick={() => !isDisabled && toggleSelection(startup.id)}
              disabled={isDisabled}
              className={cn(
                "group relative flex items-start gap-3 rounded-lg border p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : isDisabled
                  ? "border-border/50 opacity-50 cursor-not-allowed"
                  : "border-border hover:border-primary/30 hover:bg-secondary/30"
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {startup.name}
                  </span>
                  {typeof startup.matchScore === "number" && (
                    <Badge variant="secondary" className="text-xs">
                      {startup.matchScore}%
                    </Badge>
                  )}
                  {startup.batch && (
                    <Badge variant="accent" className="text-xs">
                      {startup.batch}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {startup.description}
                </p>
                {startup.matchReason && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/90">
                    {startup.matchReason}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {startup.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="tag" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StartupSelector;
