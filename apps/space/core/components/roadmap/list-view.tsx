import { useState } from "react";
import type { FC } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@plane/utils";
import type { TRoadmapIssue, TRoadmapState, TRoadmapSettings } from "@plane/services";
import { RoadmapIssueCard } from "./issue-card";

interface RoadmapListViewProps {
  issues: Record<string, TRoadmapIssue[]>;
  states: TRoadmapState[];
  settings: TRoadmapSettings;
  anchor: string;
}

// Roadmap sections configuration (Canny-style)
const ROADMAP_SECTIONS = [
  {
    key: "backlog",
    label: "Considering",
    color: "bg-gray-200",
    dotColor: "bg-gray-500",
  },
  {
    key: "unstarted",
    label: "Planned",
    color: "bg-blue-200",
    dotColor: "bg-blue-500",
  },
  {
    key: "started",
    label: "In Progress",
    color: "bg-yellow-200",
    dotColor: "bg-yellow-500",
  },
  {
    key: "completed",
    label: "Shipped",
    color: "bg-green-200",
    dotColor: "bg-green-500",
  },
];

interface SectionProps {
  sectionKey: string;
  label: string;
  dotColor: string;
  issues: TRoadmapIssue[];
  settings: TRoadmapSettings;
}

const Section: FC<SectionProps> = ({ sectionKey: _sectionKey, label, dotColor, issues, settings }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-subtle-1 bg-surface-1 overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-text-tertiary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-tertiary" />
        )}
        <div className={cn("h-2.5 w-2.5 rounded-full", dotColor)} />
        <span className="text-sm font-semibold text-text-primary">{label}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-secondary">
          {issues.length}
        </span>
      </button>

      {/* Section content */}
      {isExpanded && (
        <div className="flex flex-col gap-2 border-t border-subtle-1 p-3">
          {issues.length > 0 ? (
            issues.map((issue) => <RoadmapIssueCard key={issue.id} issue={issue} settings={settings} variant="row" />)
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-text-tertiary">No items in this section</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const RoadmapListView: FC<RoadmapListViewProps> = ({ issues, states: _states, settings, anchor: _anchor }) => {
  return (
    <div className="flex flex-col gap-4">
      {ROADMAP_SECTIONS.map((section) => {
        const sectionIssues = issues[section.key] || [];
        // Hide empty cancelled section in list view
        if (section.key === "cancelled" && sectionIssues.length === 0) return null;

        return (
          <Section
            key={section.key}
            sectionKey={section.key}
            label={section.label}
            dotColor={section.dotColor}
            issues={sectionIssues}
            settings={settings}
          />
        );
      })}
    </div>
  );
};
