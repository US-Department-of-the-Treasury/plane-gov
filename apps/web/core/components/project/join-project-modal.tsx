import { useState } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@plane/propel/primitives";
// types
import { Button } from "@plane/propel/button";
import type { IProject } from "@plane/types";
// ui
// hooks
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";

// type
type TJoinProjectModalProps = {
  isOpen: boolean;
  workspaceSlug: string;
  project: IProject;
  handleClose: () => void;
};

export function JoinProjectModal(props: TJoinProjectModalProps) {
  const { handleClose, isOpen, project, workspaceSlug } = props;
  // states
  const [isJoiningLoading, setIsJoiningLoading] = useState(false);
  // store hooks
  const { joinProject } = useUserPermissions();
  // router
  const router = useAppRouter();

  const handleJoin = () => {
    setIsJoiningLoading(true);

    joinProject(workspaceSlug, project.id)
      .then(() => {
        router.push(`/${workspaceSlug}/projects/${project.id}/issues`);
        handleClose();
      })
      .finally(() => {
        setIsJoiningLoading(false);
      });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <DialogContent
              showCloseButton={false}
              className="relative transform overflow-hidden rounded-lg bg-surface-1 px-5 py-8 text-left shadow-raised-200 sm:w-full sm:max-w-xl sm:p-6 static translate-x-0 translate-y-0 border-0"
            >
              <div className="space-y-5">
                <DialogTitle className="text-16 font-medium leading-6 text-primary">
                  Join Project?
                </DialogTitle>
                <p>
                  Are you sure you want to join the project{" "}
                  <span className="break-words font-semibold">{project?.name}</span>? Please click the &apos;Join
                  Project&apos; button below to continue.
                </p>
                <div className="space-y-3" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" size="lg" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  tabIndex={0}
                  type="submit"
                  onClick={handleJoin}
                  loading={isJoiningLoading}
                >
                  {isJoiningLoading ? "Joining..." : "Join Project"}
                </Button>
              </div>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
