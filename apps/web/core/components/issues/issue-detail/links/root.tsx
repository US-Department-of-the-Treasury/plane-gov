import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
// plane imports
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TIssueLink } from "@plane/types";
// store
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";
import { useCreateIssueLink, useUpdateIssueLink, useDeleteIssueLink } from "@/store/queries/issue";
// local imports
import { IssueLinkCreateUpdateModal } from "./create-update-link-modal";
import { IssueLinkList } from "./links";
// Note: EIssueServiceType removed - the modal no longer needs issueServiceType

export type TLinkOperations = {
  create: (data: Partial<TIssueLink>) => Promise<void>;
  update: (linkId: string, data: Partial<TIssueLink>) => Promise<void>;
  remove: (linkId: string) => Promise<void>;
};

export type TIssueLinkRoot = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
};

export function IssueLinkRoot(props: TIssueLinkRoot) {
  // props
  const { workspaceSlug, projectId, issueId, disabled = false } = props;
  // hooks - keep modal state from Zustand store
  const toggleIssueLinkModalStore = useIssueDetailUIStore((s) => s.toggleIssueLinkModal);
  // tanstack query mutations
  const { mutateAsync: createLinkMutation } = useCreateIssueLink();
  const { mutateAsync: updateLinkMutation } = useUpdateIssueLink();
  const { mutateAsync: deleteLinkMutation } = useDeleteIssueLink();
  // state
  const [isIssueLinkModal, setIsIssueLinkModal] = useState(false);
  const toggleIssueLinkModal = useCallback(
    (modalToggle: boolean) => {
      toggleIssueLinkModalStore(modalToggle);
      setIsIssueLinkModal(modalToggle);
    },
    [toggleIssueLinkModalStore]
  );

  const handleLinkOperations: TLinkOperations = useMemo(
    () => ({
      create: async (data: Partial<TIssueLink>) => {
        try {
          if (!workspaceSlug || !projectId || !issueId) throw new Error("Missing required fields");
          await createLinkMutation({ workspaceSlug, projectId, issueId, data });
          setToast({
            message: "The link has been successfully created",
            type: TOAST_TYPE.SUCCESS,
            title: "Link created",
          });
          toggleIssueLinkModal(false);
        } catch (error: any) {
          setToast({
            message: error?.data?.error ?? "The link could not be created",
            type: TOAST_TYPE.ERROR,
            title: "Link not created",
          });
          throw error;
        }
      },
      update: async (linkId: string, data: Partial<TIssueLink>) => {
        try {
          if (!workspaceSlug || !projectId || !issueId) throw new Error("Missing required fields");
          await updateLinkMutation({ workspaceSlug, projectId, issueId, linkId, data });
          setToast({
            message: "The link has been successfully updated",
            type: TOAST_TYPE.SUCCESS,
            title: "Link updated",
          });
          toggleIssueLinkModal(false);
        } catch (error) {
          setToast({
            message: "The link could not be updated",
            type: TOAST_TYPE.ERROR,
            title: "Link not updated",
          });
          throw error;
        }
      },
      remove: async (linkId: string) => {
        try {
          if (!workspaceSlug || !projectId || !issueId) throw new Error("Missing required fields");
          await deleteLinkMutation({ workspaceSlug, projectId, issueId, linkId });
          setToast({
            message: "The link has been successfully removed",
            type: TOAST_TYPE.SUCCESS,
            title: "Link removed",
          });
          toggleIssueLinkModal(false);
        } catch {
          setToast({
            message: "The link could not be removed",
            type: TOAST_TYPE.ERROR,
            title: "Link not removed",
          });
        }
      },
    }),
    [
      workspaceSlug,
      projectId,
      issueId,
      createLinkMutation,
      updateLinkMutation,
      deleteLinkMutation,
      toggleIssueLinkModal,
    ]
  );

  const handleOnClose = () => {
    toggleIssueLinkModal(false);
  };

  return (
    <>
      <IssueLinkCreateUpdateModal
        isModalOpen={isIssueLinkModal}
        handleOnClose={handleOnClose}
        linkOperations={handleLinkOperations}
      />

      <div className="py-1 text-11">
        <div className="flex items-center justify-between gap-2">
          <h4>Links</h4>
          {!disabled && (
            <button
              type="button"
              className={`grid h-7 w-7 place-items-center rounded-sm p-1 outline-none duration-300 hover:bg-surface-2 ${
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={() => toggleIssueLinkModal(true)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        <div>
          <IssueLinkList
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            issueId={issueId}
            linkOperations={handleLinkOperations}
            disabled={disabled}
          />
        </div>
      </div>
    </>
  );
}
