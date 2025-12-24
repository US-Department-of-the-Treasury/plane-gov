import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@plane/propel/primitives";
// ui
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// store queries
import { useProjects, getProjectById, useArchiveProject, useRestoreProject } from "@/store/queries/project";

type Props = {
  workspaceSlug: string;

  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  archive: boolean;
};

export function ArchiveRestoreProjectModal(props: Props) {
  const { workspaceSlug, projectId, isOpen, onClose, archive } = props;
  // router
  const router = useAppRouter();
  // store hooks
  const { data: projects } = useProjects(workspaceSlug);
  const { mutate: archiveProjectMutation, isPending: isArchiving } = useArchiveProject();
  const { mutate: restoreProjectMutation, isPending: isRestoring } = useRestoreProject();

  const projectDetails = getProjectById(projects, projectId);
  if (!projectDetails) return null;

  const isLoading = isArchiving || isRestoring;

  const handleClose = () => {
    onClose();
  };

  const handleArchiveProject = () => {
    archiveProjectMutation(
      { workspaceSlug, projectId },
      {
        onSuccess: () => {
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: "Archive success",
            message: `${projectDetails.name} has been archived successfully`,
          });
          onClose();
          router.push(`/${workspaceSlug}/projects/`);
        },
        onError: () => {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Error!",
            message: "Project could not be archived. Please try again.",
          });
        },
      }
    );
  };

  const handleRestoreProject = () => {
    restoreProjectMutation(
      { workspaceSlug, projectId },
      {
        onSuccess: () => {
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: "Restore success",
            message: `You can find ${projectDetails.name} in your projects.`,
          });
          onClose();
          router.push(`/${workspaceSlug}/projects/`);
        },
        onError: () => {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Error!",
            message: "Project could not be restored. Please try again.",
          });
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogContent
              showCloseButton={false}
              className="relative transform overflow-hidden rounded-lg bg-surface-1 text-left shadow-raised-200 sm:my-8 sm:w-full sm:max-w-lg static translate-x-0 translate-y-0 p-0 border-0"
            >
              <div className="px-5 py-4">
                <h3 className="text-18 font-medium 2xl:text-20">
                  {archive ? "Archive" : "Restore"} {projectDetails.name}
                </h3>
                <p className="mt-3 text-13 text-secondary">
                  {archive
                    ? "This project and its work items, sprints, epics, and pages will be archived. Its work items won't appear in search. Only project admins can restore the project."
                    : "Restoring a project will activate it and make it visible to all members of the project. Are you sure you want to continue?"}
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="lg" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    tabIndex={1}
                    onClick={archive ? handleArchiveProject : handleRestoreProject}
                    loading={isLoading}
                  >
                    {archive ? (isLoading ? "Archiving" : "Archive") : isLoading ? "Restoring" : "Restore"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
