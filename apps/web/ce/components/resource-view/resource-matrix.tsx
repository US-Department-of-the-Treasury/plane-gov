import { format } from "date-fns";
import { Calendar, Users } from "lucide-react";
// ui
import { Avatar, Loader } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import { useWorkspaceMembers } from "@/store/queries/member";
import { useWorkspaceSprints, getSprintIds, getActiveSprint, getSprintById } from "@/store/queries/sprint";
// components
import { SprintProjectCell } from "./sprint-project-cell";
import { useSprintProjectAssignments } from "./use-sprint-assignments";

type ResourceMatrixProps = {
  workspaceSlug: string;
};

export function ResourceMatrix({ workspaceSlug }: ResourceMatrixProps) {
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceSlug);
  const { data: sprints, isLoading: sprintsLoading } = useWorkspaceSprints(workspaceSlug);
  const { getAssignment, setAssignment } = useSprintProjectAssignments(workspaceSlug);

  const memberIds = members?.map((m) => m.id) || [];
  const sprintIds = getSprintIds(sprints);
  const activeSprint = getActiveSprint(sprints);
  const activeSprintId = activeSprint?.id;

  const isLoading = membersLoading || sprintsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader className="flex flex-col gap-4 w-full max-w-4xl">
          <Loader.Item height="44px" width="100%" />
          <Loader.Item height="44px" width="100%" />
          <Loader.Item height="44px" width="100%" />
          <Loader.Item height="44px" width="100%" />
          <Loader.Item height="44px" width="100%" />
        </Loader>
      </div>
    );
  }

  if (memberIds.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <Users className="h-12 w-12 text-custom-text-400" />
        <p className="text-custom-text-300 text-sm">No team members found</p>
        <p className="text-custom-text-400 text-xs">Add team members to start planning resources</p>
      </div>
    );
  }

  if (sprintIds.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <Calendar className="h-12 w-12 text-custom-text-400" />
        <p className="text-custom-text-300 text-sm">No sprints found</p>
        <p className="text-custom-text-400 text-xs">Create sprints to assign team members to projects</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <div className="min-w-max">
        {/* Header row with sprint columns */}
        <div className="sticky top-0 z-10 flex border-b border-subtle bg-surface-1">
          {/* Member column header - empty to match projects list */}
          <div className="sticky left-0 z-20 flex w-56 min-w-56 items-center bg-surface-1 px-page-x py-1.5" />
          {/* Sprint column headers */}
          {sprintIds.map((sprintId) => {
            const sprint = getSprintById(sprints, sprintId);
            if (!sprint) return null;

            const isActive = sprintId === activeSprintId;
            const startDate = sprint.start_date ? format(new Date(sprint.start_date), "MMM d") : "";
            const endDate = sprint.end_date ? format(new Date(sprint.end_date), "MMM d") : "";

            return (
              <div
                key={sprintId}
                className={cn("flex w-36 min-w-36 flex-col items-center justify-center px-2 py-1", {
                  "bg-accent-primary/5": isActive,
                })}
              >
                <div className="flex items-center gap-1">
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />}
                  <span
                    className={cn("text-11 font-medium truncate max-w-[110px]", {
                      "text-accent-primary": isActive,
                      "text-tertiary": !isActive,
                    })}
                  >
                    {sprint.name || `Sprint ${sprint.number}`}
                  </span>
                </div>
                <span className="text-10 text-placeholder">
                  {startDate} - {endDate}
                </span>
              </div>
            );
          })}
        </div>

        {/* Member rows - clean list style */}
        {members?.map((member, index) => {
          // Access user data from the nested member object
          const user = member.member;
          const displayName = user?.display_name || user?.first_name || user?.email || "Unknown";
          const avatarUrl = user?.avatar_url;
          const isLastRow = index === members.length - 1;

          return (
            <div
              key={member.id}
              className={cn(
                "group flex min-h-11 transition-colors hover:bg-layer-transparent-hover",
                !isLastRow && "border-b border-subtle"
              )}
            >
              {/* Member info */}
              <div className="sticky left-0 z-10 flex w-56 min-w-56 items-center gap-2.5 bg-layer-transparent px-page-x py-2 group-hover:bg-layer-transparent-hover transition-colors">
                <Avatar name={displayName} src={avatarUrl} size="sm" showTooltip={false} />
                <span className="truncate text-13 text-primary">{displayName}</span>
              </div>

              {/* Sprint cells for this member */}
              {sprintIds.map((sprintId) => {
                const isActive = sprintId === activeSprintId;
                const assignedProjectId = getAssignment(member.id, sprintId);

                return (
                  <SprintProjectCell
                    key={`${member.id}-${sprintId}`}
                    workspaceSlug={workspaceSlug}
                    memberId={member.id}
                    sprintId={sprintId}
                    assignedProjectId={assignedProjectId}
                    onAssignmentChange={setAssignment}
                    isActiveSprint={isActive}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
