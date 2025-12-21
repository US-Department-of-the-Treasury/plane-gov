import { observer } from "mobx-react";
import { format } from "date-fns";
import { useTranslation } from "@plane/i18n";
// ui
import { Avatar, Loader } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useSprint } from "@/hooks/store/use-sprint";

type ResourceMatrixProps = {
  workspaceSlug: string;
};

export const ResourceMatrix = observer(function ResourceMatrix({ workspaceSlug }: ResourceMatrixProps) {
  const { t } = useTranslation();
  const { workspace: workspaceMemberStore, getUserDetails } = useMember();
  const sprintStore = useSprint();

  const memberIds = workspaceMemberStore.getWorkspaceMemberIds(workspaceSlug);
  const sprintIds = sprintStore.currentWorkspaceSprintIds;
  const activeSprintId = sprintStore.currentWorkspaceActiveSprintId;

  const isLoading = !memberIds || !sprintIds || sprintStore.loader;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader className="flex flex-col gap-4 w-full max-w-4xl">
          <Loader.Item height="40px" width="100%" />
          <Loader.Item height="40px" width="100%" />
          <Loader.Item height="40px" width="100%" />
          <Loader.Item height="40px" width="100%" />
          <Loader.Item height="40px" width="100%" />
        </Loader>
      </div>
    );
  }

  if (memberIds.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-custom-text-300">{t("no_members_found")}</p>
      </div>
    );
  }

  if (sprintIds.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-custom-text-300">{t("no_sprints_found")}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto p-4">
      <div className="min-w-max">
        {/* Header row with sprint columns */}
        <div className="flex border-b border-custom-border-200">
          {/* Member column header */}
          <div className="sticky left-0 z-10 flex w-64 min-w-64 items-center bg-custom-background-100 px-4 py-3 font-medium text-custom-text-200">
            {t("team_members")}
          </div>
          {/* Sprint column headers */}
          {sprintIds.map((sprintId) => {
            const sprint = sprintStore.getSprintById(sprintId);
            if (!sprint) return null;

            const isActive = sprintId === activeSprintId;
            const startDate = sprint.start_date ? format(new Date(sprint.start_date), "MMM d") : "";
            const endDate = sprint.end_date ? format(new Date(sprint.end_date), "MMM d") : "";

            return (
              <div
                key={sprintId}
                className={cn(
                  "flex w-40 min-w-40 flex-col items-center justify-center border-l border-custom-border-200 px-3 py-2",
                  {
                    "bg-custom-primary-100/10": isActive,
                  }
                )}
              >
                <span
                  className={cn("text-sm font-medium", {
                    "text-custom-primary-100": isActive,
                    "text-custom-text-200": !isActive,
                  })}
                >
                  {sprint.name || `Sprint ${sprint.number}`}
                </span>
                <span className="text-xs text-custom-text-400">
                  {startDate} - {endDate}
                </span>
                {isActive && (
                  <span className="mt-1 rounded-full bg-custom-primary-100 px-2 py-0.5 text-xs text-white">
                    {t("current")}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Member rows */}
        {memberIds.map((memberId) => {
          const member = getUserDetails(memberId);
          if (!member) return null;

          return (
            <div key={memberId} className="flex border-b border-custom-border-100 hover:bg-custom-background-90">
              {/* Member info */}
              <div className="sticky left-0 z-10 flex w-64 min-w-64 items-center gap-3 bg-custom-background-100 px-4 py-3">
                <Avatar
                  name={member.display_name || member.email}
                  src={member.avatar_url}
                  size="md"
                  showTooltip={false}
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium text-custom-text-100">
                    {member.display_name || member.first_name || member.email}
                  </span>
                  {member.email && <span className="truncate text-xs text-custom-text-400">{member.email}</span>}
                </div>
              </div>

              {/* Sprint cells for this member */}
              {sprintIds.map((sprintId) => {
                const isActive = sprintId === activeSprintId;

                return (
                  <div
                    key={`${memberId}-${sprintId}`}
                    className={cn(
                      "flex w-40 min-w-40 items-center justify-center border-l border-custom-border-100 px-3 py-3",
                      {
                        "bg-custom-primary-100/5": isActive,
                      }
                    )}
                  >
                    {/* Placeholder for sprint assignments - will be populated with actual data */}
                    <span className="text-xs text-custom-text-400">-</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});
