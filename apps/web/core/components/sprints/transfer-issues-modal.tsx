import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@plane/propel/primitives";
import { SprintIcon, TransferIcon, CloseIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { ISprint } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { useProjectSprints, getSprintById } from "@/store/queries/sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/store/queries/query-keys";
//icons
// constants

type Props = {
  isOpen: boolean;
  handleClose: () => void;
  sprintId: string;
};

export function TransferIssuesModal(props: Props) {
  const { isOpen, handleClose, sprintId } = props;
  // states
  const [query, setQuery] = useState("");

  // store hooks
  const { workspaceSlug, projectId } = useParams();
  const { data: sprints } = useProjectSprints(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const {
    issues: { transferIssuesFromSprint },
  } = useIssues(EIssuesStoreType.SPRINT);
  const queryClient = useQueryClient();

  // Compute incomplete sprint IDs
  const currentProjectIncompleteSprintIds = useMemo(() => {
    if (!sprints) return [];
    const now = new Date();
    return sprints
      .filter((sprint: ISprint) => {
        if (sprint.archived_at) return false;
        if (!sprint.end_date) return true; // Draft sprints
        const endDate = new Date(sprint.end_date);
        return endDate >= now; // Not completed
      })
      .map((sprint: ISprint) => sprint.id);
  }, [sprints]);

  const transferIssue = async (payload: { new_sprint_id: string }) => {
    if (!workspaceSlug || !projectId || !sprintId) return;

    await transferIssuesFromSprint(workspaceSlug.toString(), projectId.toString(), sprintId.toString(), payload)
      .then(async () => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Work items have been transferred successfully",
        });
        // Invalidate sprint queries to refresh data
        await queryClient.invalidateQueries({
          queryKey: queryKeys.sprints.all(workspaceSlug.toString(), projectId.toString()),
        });
        await queryClient.invalidateQueries({
          queryKey: [...queryKeys.sprints.detail(sprintId), "progress"],
        });
        await queryClient.invalidateQueries({
          queryKey: [...queryKeys.sprints.detail(payload.new_sprint_id), "progress"],
        });
      })
      .catch(() => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Unable to transfer work items. Please try again.",
        });
      });
  };

  const filteredOptions = currentProjectIncompleteSprintIds?.filter((optionId: string) => {
    const sprintDetails = getSprintById(sprints, optionId);

    return sprintDetails?.name?.toLowerCase().includes(query?.toLowerCase());
  });

  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === "Escape") {
  //       handleClose();
  //     }
  //   };
  // }, [handleClose]);

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50">
          <div className="mt-10 flex min-h-full items-start justify-center p-4 text-center sm:p-0 md:mt-20">
            <DialogContent
              showCloseButton={false}
              className="relative transform rounded-lg bg-surface-1 py-5 text-left shadow-raised-200 sm:w-full sm:max-w-2xl static translate-x-0 translate-y-0 p-0 border-0"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-5 pt-5">
                  <div className="flex items-center gap-1">
                    <TransferIcon className="w-5 fill-primary" />
                    <h4 className="text-18 font-medium text-primary">Transfer work items</h4>
                  </div>
                  <button onClick={handleClose}>
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 border-b border-subtle px-5 pb-3">
                  <Search className="h-4 w-4 text-secondary" />
                  <input
                    className="outline-none text-13"
                    placeholder="Search for a sprint..."
                    onChange={(e) => setQuery(e.target.value)}
                    value={query}
                  />
                </div>
                <div className="flex w-full flex-col items-start gap-2 px-5 pb-5">
                  {filteredOptions ? (
                    filteredOptions.length > 0 ? (
                      filteredOptions.map((optionId: string) => {
                        const sprintDetails = getSprintById(sprints, optionId);

                        if (!sprintDetails) return;

                        return (
                          <button
                            key={optionId}
                            className="flex w-full items-center gap-4 rounded-sm px-4 py-3 text-13 text-secondary hover:bg-surface-2"
                            onClick={() => {
                              transferIssue({
                                new_sprint_id: optionId,
                              });
                              handleClose();
                            }}
                          >
                            <SprintIcon className="h-5 w-5" />
                            <div className="flex w-full justify-between truncate">
                              <span className="truncate">{sprintDetails?.name}</span>
                              {sprintDetails.status && (
                                <span className="flex-shrink-0 flex items-center rounded-full bg-layer-1  px-2 capitalize">
                                  {sprintDetails.status.toLocaleLowerCase()}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex w-full items-center justify-center gap-4 p-5 text-13">
                        <AlertCircle className="h-3.5 w-3.5 text-secondary" />
                        <span className="text-center text-secondary">
                          You don't have any current sprint. Please create one to transfer the work items.
                        </span>
                      </div>
                    )
                  ) : (
                    <p className="text-center text-secondary">Loading...</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
