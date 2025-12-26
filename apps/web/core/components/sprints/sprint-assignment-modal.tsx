"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "@plane/i18n";
import type { ISprint, IWorkspaceMember } from "@plane/types";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { ModalCore, Avatar } from "@plane/ui";
import { SprintIcon, ChevronLeftIcon } from "@plane/propel/icons";
// hooks
import { useWorkspaceSprints } from "@/store/queries/sprint";
import { useWorkspaceMembers } from "@/store/queries/member";
import { useSprintProjectAssignments } from "ce/components/resource-view/use-sprint-assignments";
// utils
import { renderFormattedDate } from "@plane/utils";

interface SprintAssignmentModalProps {
  workspaceSlug: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Step = "sprint" | "member";

/**
 * Modal to assign a workspace member to work on this project during a sprint.
 * Two-step flow:
 * 1. Select a sprint (current or upcoming)
 * 2. Select an available team member (members already assigned elsewhere are disabled)
 *
 * Creates SprintMemberProject records (one project per sprint per person).
 */
export function SprintAssignmentModal({
  workspaceSlug,
  projectId,
  isOpen,
  onClose,
}: SprintAssignmentModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("sprint");
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Fetch all workspace sprints
  const { data: workspaceSprints, isLoading: sprintsLoading } = useWorkspaceSprints(workspaceSlug);

  // Fetch workspace members
  const { data: workspaceMembers, isLoading: membersLoading } = useWorkspaceMembers(workspaceSlug);

  // Fetch sprint member project assignments (to check availability)
  const { assignments, setAssignment, isLoading: assignmentsLoading } = useSprintProjectAssignments(workspaceSlug);

  // Get available sprints (current + upcoming, not archived)
  const availableSprints = useMemo(() => {
    if (!workspaceSprints) return [];
    const now = new Date();
    return workspaceSprints
      .filter((sprint) => {
        if (sprint.archived_at) return false;
        if (!sprint.end_date) return true;
        // Include if not ended yet
        return new Date(sprint.end_date) >= now;
      })
      .sort((a, b) => {
        if (!a.start_date || !b.start_date) return 0;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
  }, [workspaceSprints]);

  // Get selected sprint
  const selectedSprint = useMemo(() => {
    if (!selectedSprintId || !workspaceSprints) return null;
    return workspaceSprints.find((s) => s.id === selectedSprintId) ?? null;
  }, [selectedSprintId, workspaceSprints]);

  // Get members with availability status for selected sprint
  const membersWithAvailability = useMemo(() => {
    if (!workspaceMembers || !selectedSprintId) return [];

    return workspaceMembers.map((member) => {
      const KEY_SEPARATOR = "::";
      const key = `${member.id}${KEY_SEPARATOR}${selectedSprintId}`;
      const assignedProjectId = assignments[key];

      return {
        member,
        isAvailable: !assignedProjectId,
        assignedProjectId,
        isAssignedToThisProject: assignedProjectId === projectId,
      };
    });
  }, [workspaceMembers, selectedSprintId, assignments, projectId]);

  const isLoading = sprintsLoading || membersLoading || assignmentsLoading;

  const getSprintStatus = (sprint: ISprint): "completed" | "active" | "upcoming" => {
    const now = new Date();
    if (!sprint.start_date || !sprint.end_date) return "upcoming";
    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    if (endDate < now) return "completed";
    if (startDate <= now && now <= endDate) return "active";
    return "upcoming";
  };

  const getStatusBadge = (status: "completed" | "active" | "upcoming") => {
    const styles = {
      completed: "bg-success-surface text-success-strong",
      active: "bg-highlight-surface text-highlight-strong",
      upcoming: "bg-subtle text-placeholder",
    };
    const labels = {
      completed: "Completed",
      active: "Active",
      upcoming: "Upcoming",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleSelectSprint = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    setStep("member");
  };

  const handleBack = () => {
    setStep("sprint");
  };

  const handleSelectMember = async (memberId: string) => {
    if (!selectedSprintId) return;

    setIsPending(true);
    try {
      await setAssignment(memberId, selectedSprintId, projectId);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: "Team member assigned to sprint for this project",
      });
      handleClose();
    } catch (error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error"),
        message: "Failed to assign team member to sprint",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleClose = () => {
    setStep("sprint");
    setSelectedSprintId(null);
    onClose();
  };

  const getMemberDisplayName = (member: IWorkspaceMember): string => {
    if (!member.member) return "Unknown";
    return member.member.display_name || member.member.email || "Unknown";
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose}>
      <div className="w-full max-w-lg p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          {step === "member" && (
            <button
              onClick={handleBack}
              className="p-1 rounded hover:bg-layer-2 transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4 text-tertiary" />
            </button>
          )}
          <SprintIcon className="h-5 w-5 text-tertiary" />
          <h3 className="text-lg font-medium text-primary">
            {step === "sprint" ? "Assign Sprint" : `Assign to ${selectedSprint?.name}`}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm text-secondary mb-4">
          {step === "sprint"
            ? "Select a sprint to assign a team member for this project."
            : "Select a team member to work on this project during this sprint. Each person can only work on one project per sprint."}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : step === "sprint" ? (
          /* Step 1: Sprint Selection */
          availableSprints.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary">
                No upcoming sprints available. Sprints will be auto-generated when the workspace sprint schedule is configured.
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-subtle rounded-md">
              {availableSprints.map((sprint) => {
                const status = getSprintStatus(sprint);

                return (
                  <div
                    key={sprint.id}
                    className="flex items-center gap-3 p-3 border-b border-subtle last:border-b-0 cursor-pointer hover:bg-layer-2 transition-colors"
                    onClick={() => handleSelectSprint(sprint.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary truncate">{sprint.name}</span>
                        {getStatusBadge(status)}
                      </div>
                      <div className="text-xs text-tertiary mt-0.5">
                        {sprint.start_date && sprint.end_date ? (
                          <>
                            {renderFormattedDate(sprint.start_date)} - {renderFormattedDate(sprint.end_date)}
                          </>
                        ) : (
                          "Dates not set"
                        )}
                      </div>
                    </div>
                    <ChevronLeftIcon className="h-4 w-4 text-tertiary rotate-180" />
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Step 2: Member Selection */
          membersWithAvailability.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary">
                No workspace members found. Invite members to your workspace first.
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-subtle rounded-md">
              {membersWithAvailability.map(({ member, isAvailable, isAssignedToThisProject }) => {
                const displayName = getMemberDisplayName(member);
                const isDisabled = !isAvailable && !isAssignedToThisProject;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 border-b border-subtle last:border-b-0 transition-colors ${
                      isDisabled
                        ? "opacity-50 cursor-not-allowed bg-layer-1"
                        : isAssignedToThisProject
                        ? "bg-success-surface/20"
                        : "cursor-pointer hover:bg-layer-2"
                    }`}
                    onClick={() => !isDisabled && !isAssignedToThisProject && handleSelectMember(member.id)}
                  >
                    <Avatar
                      name={displayName}
                      src={member.member?.avatar_url ?? undefined}
                      size={32}
                      shape="circle"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isDisabled ? "text-tertiary" : "text-primary"}`}>
                          {displayName}
                        </span>
                        {isAssignedToThisProject && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success-surface text-success-strong">
                            Already assigned
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-tertiary mt-0.5">
                        {isDisabled
                          ? "Assigned to another project this sprint"
                          : member.member?.email}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="lg" onClick={handleClose} disabled={isPending}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </ModalCore>
  );
}
