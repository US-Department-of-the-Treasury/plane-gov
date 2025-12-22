import type { FC } from "react";
import { cn } from "@plane/utils";
import type { TRoadmapIssue, TRoadmapState, TRoadmapSettings } from "@plane/services";
import { RoadmapIssueCard } from "./issue-card";

interface RoadmapKanbanViewProps {
  issues: Record<string, TRoadmapIssue[]>;
  states: TRoadmapState[];
  settings: TRoadmapSettings;
  anchor: string;
}

// Roadmap columns configuration (Canny-style)
const ROADMAP_COLUMNS = [
  {
    key: "backlog",
    label: "Considering",
    description: "Ideas we're exploring",
    color: "bg-gray-100 border-gray-300",
    headerColor: "text-gray-700",
  },
  {
    key: "unstarted",
    label: "Planned",
    description: "On our radar",
    color: "bg-blue-50 border-blue-300",
    headerColor: "text-blue-700",
  },
  {
    key: "started",
    label: "In Progress",
    description: "Currently working on",
    color: "bg-yellow-50 border-yellow-300",
    headerColor: "text-yellow-700",
  },
  {
    key: "completed",
    label: "Shipped",
    description: "Completed features",
    color: "bg-green-50 border-green-300",
    headerColor: "text-green-700",
  },
];

export const RoadmapKanbanView: FC<RoadmapKanbanViewProps> = ({
  issues,
  states: _states,
  settings,
  anchor: _anchor,
}) => {
  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {ROADMAP_COLUMNS.map((column) => {
        const columnIssues = issues[column.key] || [];

        return (
          <div key={column.key} className="flex flex-col min-w-[300px] max-w-[350px] flex-1">
            {/* Column header */}
            <div className={cn("flex flex-col gap-1 rounded-t-lg border-t-4 bg-surface-1 px-4 py-3", column.color)}>
              <div className="flex items-center justify-between">
                <h2 className={cn("text-sm font-semibold", column.headerColor)}>{column.label}</h2>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-secondary">
                  {columnIssues.length}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">{column.description}</p>
            </div>

            {/* Column content */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-b-lg bg-surface-2 p-3">
              {columnIssues.length > 0 ? (
                columnIssues.map((issue) => (
                  <RoadmapIssueCard key={issue.id} issue={issue} settings={settings} variant="card" />
                ))
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <p className="text-sm text-text-tertiary">No items</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
