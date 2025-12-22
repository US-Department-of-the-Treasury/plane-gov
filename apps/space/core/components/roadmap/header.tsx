import type { FC } from "react";
import { Kanban, List } from "lucide-react";
import { cn } from "@plane/utils";

type RoadmapViewMode = "kanban" | "list";

interface RoadmapHeaderProps {
  projectName: string;
  viewMode: RoadmapViewMode;
  onViewModeChange: (mode: RoadmapViewMode) => void;
  counts: Record<string, number>;
}

const STATE_GROUP_LABELS: Record<string, string> = {
  backlog: "Considering",
  unstarted: "Planned",
  started: "In Progress",
  completed: "Shipped",
  cancelled: "Cancelled",
};

export const RoadmapHeader: FC<RoadmapHeaderProps> = ({ projectName, viewMode, onViewModeChange, counts }) => {
  const totalIssues = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex flex-col gap-4 border-b border-subtle-1 bg-surface-1 px-5 py-4">
      {/* Top row: Title and view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-text-primary">{projectName}</h1>
          <p className="text-sm text-text-tertiary">
            {totalIssues} {totalIssues === 1 ? "item" : "items"} on the roadmap
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-md border border-subtle-2 p-1">
          <button
            className={cn(
              "flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "kanban" ? "bg-primary-1 text-primary-7" : "text-text-secondary hover:bg-surface-2"
            )}
            onClick={() => onViewModeChange("kanban")}
          >
            <Kanban className="h-4 w-4" />
            Board
          </button>
          <button
            className={cn(
              "flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "list" ? "bg-primary-1 text-primary-7" : "text-text-secondary hover:bg-surface-2"
            )}
            onClick={() => onViewModeChange("list")}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      </div>

      {/* State group pills */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(STATE_GROUP_LABELS).map(([group, label]) => {
          const count = counts[group] || 0;
          if (group === "cancelled" && count === 0) return null; // Hide cancelled if empty
          return (
            <div key={group} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm">
              <span className="text-text-secondary">{label}</span>
              <span className="font-medium text-text-primary">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
