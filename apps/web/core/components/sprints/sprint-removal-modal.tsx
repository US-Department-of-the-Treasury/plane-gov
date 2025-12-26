"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, ArrowRight, Inbox } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import type { ISprint, TRemovalImpact } from "@plane/types";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EModalPosition, EModalWidth, ModalCore, Loader } from "@plane/ui";
import { SprintIcon } from "@plane/propel/icons";
// hooks
import { useRemovalImpact, useBulkMoveIssues, useWorkspaceSprints } from "@/store/queries/sprint";
// utils
import { renderFormattedDate } from "@plane/utils";

interface SprintRemovalModalProps {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
  memberId: string;
  assignmentId: string;
  memberName: string;
  isOpen: boolean;
  onClose: () => void;
  onRemoved?: () => void;
}

type MoveOption = "next_sprint" | "backlog" | "none";

/**
 * Modal shown when removing a team member's assignment from a sprint-project.
 * Warns about orphaned issues if this is the last member and offers options to move them.
 */
export function SprintRemovalModal({
  workspaceSlug,
  projectId,
  sprintId,
  memberId,
  assignmentId,
  memberName,
  isOpen,
  onClose,
  onRemoved,
}: SprintRemovalModalProps) {
  const { t } = useTranslation();
  const [moveOption, setMoveOption] = useState<MoveOption>("none");
  const [isRemoving, setIsRemoving] = useState(false);

  // Fetch impact data
  const { data: impact, isLoading: impactLoading } = useRemovalImpact(
    workspaceSlug,
    assignmentId,
    isOpen
  );

  // Get sprint details for display
  const { data: sprints } = useWorkspaceSprints(workspaceSlug);
  const sprint = useMemo(() => sprints?.find((s) => s.id === sprintId), [sprints, sprintId]);

  // Bulk move mutation
  const bulkMoveMutation = useBulkMoveIssues(workspaceSlug);

  const hasOrphanedIssues = impact?.is_last_member && (impact?.orphaned_issue_count ?? 0) > 0;
  const hasNextSprint = !!impact?.next_sprint;

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      // If there are orphaned issues and user selected to move them
      if (hasOrphanedIssues && moveOption !== "none") {
        const targetSprintId = moveOption === "next_sprint" && impact?.next_sprint
          ? impact.next_sprint.id
          : null;

        await bulkMoveMutation.mutateAsync({
          sprintId,
          data: {
            issue_ids: "all",
            target_sprint_id: targetSprintId,
            project_id: projectId,
          },
        });
      }

      // Now remove the assignment (handled by parent component)
      onRemoved?.();

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: hasOrphanedIssues && moveOption !== "none"
          ? `${memberName} removed and ${impact?.orphaned_issue_count} issues moved`
          : `${memberName} removed from sprint`,
      });
      handleClose();
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error"),
        message: "Failed to complete the removal. Please try again.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleClose = () => {
    setMoveOption("none");
    onClose();
  };

  const renderImpactWarning = () => {
    if (!impact?.is_last_member) return null;
    if (!hasOrphanedIssues) return null;

    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              Last team member for this project
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Removing {memberName} will leave {impact.orphaned_issue_count} issue
              {impact.orphaned_issue_count !== 1 ? "s" : ""} without an assigned team member.
              What would you like to do with these issues?
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderMoveOptions = () => {
    if (!hasOrphanedIssues) return null;

    return (
      <div className="space-y-2 mb-4">
        {/* Move to next sprint option */}
        {hasNextSprint && impact?.next_sprint && (
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              moveOption === "next_sprint"
                ? "border-custom-primary-100 bg-custom-primary-100/5"
                : "border-subtle hover:bg-layer-2"
            }`}
          >
            <input
              type="radio"
              name="moveOption"
              value="next_sprint"
              checked={moveOption === "next_sprint"}
              onChange={() => setMoveOption("next_sprint")}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-tertiary" />
                <span className="font-medium text-primary">Move to next sprint</span>
              </div>
              <p className="text-sm text-tertiary mt-1">
                Move issues to <span className="font-medium">{impact.next_sprint.name}</span>
                {impact.next_sprint.start_date && (
                  <span className="text-tertiary">
                    {" "}(starts {renderFormattedDate(impact.next_sprint.start_date)})
                  </span>
                )}
              </p>
            </div>
          </label>
        )}

        {/* Move to backlog option */}
        <label
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            moveOption === "backlog"
              ? "border-custom-primary-100 bg-custom-primary-100/5"
              : "border-subtle hover:bg-layer-2"
          }`}
        >
          <input
            type="radio"
            name="moveOption"
            value="backlog"
            checked={moveOption === "backlog"}
            onChange={() => setMoveOption("backlog")}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-tertiary" />
              <span className="font-medium text-primary">Move to backlog</span>
            </div>
            <p className="text-sm text-tertiary mt-1">
              Remove sprint assignment and return issues to the backlog
            </p>
          </div>
        </label>

        {/* Leave as-is option */}
        <label
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            moveOption === "none"
              ? "border-custom-primary-100 bg-custom-primary-100/5"
              : "border-subtle hover:bg-layer-2"
          }`}
        >
          <input
            type="radio"
            name="moveOption"
            value="none"
            checked={moveOption === "none"}
            onChange={() => setMoveOption("none")}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-primary">Leave issues orphaned</span>
            </div>
            <p className="text-sm text-tertiary mt-1">
              Issues will remain in this sprint but with no assigned team member (shows warning)
            </p>
          </div>
        </label>
      </div>
    );
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.TOP} width={EModalWidth.XXL}>
      <div className="relative space-y-4 py-5">
        {/* Header */}
        <div className="relative flex items-center gap-2 px-5">
          <SprintIcon className="h-5 w-5 text-tertiary" />
          <h3 className="text-lg font-medium text-primary">Remove Sprint Assignment</h3>
        </div>

        {/* Content */}
        <div className="px-5">
          {impactLoading ? (
            <Loader className="space-y-4">
              <Loader.Item height="60px" width="100%" />
              <Loader.Item height="40px" width="100%" />
            </Loader>
          ) : (
            <>
              {/* Basic info */}
              <p className="text-sm text-secondary mb-4">
                Remove <span className="font-medium text-primary">{memberName}</span> from working on this
                project during <span className="font-medium text-primary">{sprint?.name ?? "this sprint"}</span>.
              </p>

              {/* Warning if last member */}
              {renderImpactWarning()}

              {/* Move options if orphaned issues */}
              {renderMoveOptions()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="relative flex justify-end items-center gap-3 px-5 pt-4 border-t border-subtle">
          <Button variant="secondary" size="lg" onClick={handleClose} disabled={isRemoving}>
            Cancel
          </Button>
          <Button
            variant={hasOrphanedIssues && moveOption === "none" ? "error-fill" : "primary"}
            size="lg"
            onClick={handleRemove}
            disabled={isRemoving || impactLoading}
          >
            {isRemoving ? "Removing..." : hasOrphanedIssues && moveOption === "none" ? "Remove Anyway" : "Remove"}
          </Button>
        </div>
      </div>
    </ModalCore>
  );
}
