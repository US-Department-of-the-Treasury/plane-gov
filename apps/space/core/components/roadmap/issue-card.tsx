import type { FC } from "react";
import { ThumbsUp, Calendar, Hash } from "lucide-react";
import { cn } from "@plane/utils";
import type { TRoadmapIssue, TRoadmapSettings } from "@plane/services";

interface RoadmapIssueCardProps {
  issue: TRoadmapIssue;
  settings: TRoadmapSettings;
  variant?: "card" | "row";
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500 bg-red-50",
  high: "text-orange-500 bg-orange-50",
  medium: "text-yellow-500 bg-yellow-50",
  low: "text-green-500 bg-green-50",
  none: "text-gray-500 bg-gray-50",
};

export const RoadmapIssueCard: FC<RoadmapIssueCardProps> = ({ issue, settings, variant = "card" }) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (variant === "row") {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-subtle-1 bg-surface-1 p-4 hover:border-subtle-2 transition-colors">
        {/* Issue identifier */}
        <div className="flex items-center gap-1.5 text-sm text-text-tertiary shrink-0">
          <Hash className="h-3.5 w-3.5" />
          {issue.sequence_id}
        </div>

        {/* Issue name */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text-primary truncate">{issue.name}</h3>
          {issue.description_stripped && (
            <p className="text-xs text-text-tertiary truncate mt-0.5">{issue.description_stripped}</p>
          )}
        </div>

        {/* Priority */}
        {issue.priority && issue.priority !== "none" && (
          <div
            className={cn(
              "shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize",
              PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.none
            )}
          >
            {issue.priority}
          </div>
        )}

        {/* Target date */}
        {issue.target_date && (
          <div className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(issue.target_date)}
          </div>
        )}

        {/* Vote count */}
        {settings.is_votes_enabled && (
          <div className="flex shrink-0 items-center gap-1 text-sm text-text-secondary">
            <ThumbsUp className="h-4 w-4" />
            <span className="font-medium">{issue.vote_count}</span>
          </div>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-subtle-1 bg-surface-1 p-4 hover:border-subtle-2 transition-colors">
      {/* Header: identifier + priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Hash className="h-3 w-3" />
          {issue.sequence_id}
        </div>
        {issue.priority && issue.priority !== "none" && (
          <div
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium capitalize",
              PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.none
            )}
          >
            {issue.priority}
          </div>
        )}
      </div>

      {/* Issue name */}
      <h3 className="text-sm font-medium text-text-primary line-clamp-2">{issue.name}</h3>

      {/* Description preview */}
      {issue.description_stripped && (
        <p className="text-xs text-text-tertiary line-clamp-2">{issue.description_stripped}</p>
      )}

      {/* Footer: date + votes */}
      <div className="flex items-center justify-between pt-1 border-t border-subtle-1">
        {/* Target date */}
        {issue.target_date ? (
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <Calendar className="h-3 w-3" />
            {formatDate(issue.target_date)}
          </div>
        ) : (
          <div />
        )}

        {/* Vote count */}
        {settings.is_votes_enabled && (
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span className="font-medium">{issue.vote_count}</span>
          </div>
        )}
      </div>
    </div>
  );
};
