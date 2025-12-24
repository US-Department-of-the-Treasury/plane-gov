import { useState } from "react";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@plane/propel/primitives";
// i18n
import { useTranslation } from "@plane/i18n";
// types
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TDeDupeIssue, TIssue } from "@plane/types";
// queries
import { useIssue } from "@/store/queries/issue";
import { useProjects, getProjectById } from "@/store/queries/project";

type Props = {
  data?: TIssue | TDeDupeIssue;
  dataId?: string | null | undefined;
  handleClose: () => void;
  isOpen: boolean;
  onSubmit?: () => Promise<void>;
};

export function ArchiveIssueModal(props: Props) {
  const { dataId, data, isOpen, handleClose, onSubmit } = props;
  const { t } = useTranslation();
  // states
  const [isArchiving, setIsArchiving] = useState(false);
  const { workspaceSlug, projectId } = useParams();
  // queries
  const { data: projects = [] } = useProjects(workspaceSlug?.toString() || "");
  // Only fetch issue if dataId is provided but data is not
  const shouldFetchIssue = !data && !!dataId;
  const { data: fetchedIssue } = useIssue(
    workspaceSlug?.toString() || "",
    projectId?.toString() || "",
    shouldFetchIssue ? dataId : ""
  );

  if (!dataId && !data) return null;

  const issue = data || fetchedIssue;
  if (!issue) return null;

  const projectDetails = getProjectById(projects, issue.project_id);

  const onClose = () => {
    setIsArchiving(false);
    handleClose();
  };

  const handleArchiveIssue = async () => {
    if (!onSubmit) return;

    setIsArchiving(true);
    await onSubmit()
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("issue.archive.success.label"),
          message: t("issue.archive.success.message"),
        });
        onClose();
      })
      .catch(() =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("common.error.label"),
          message: t("issue.archive.failed.message"),
        })
      )
      .finally(() => setIsArchiving(false));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
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
                  {t("issue.archive.label")} {projectDetails?.identifier} {issue.sequence_id}
                </h3>
                <p className="mt-3 text-13 text-secondary">{t("issue.archive.confirm_message")}</p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="lg" onClick={onClose}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="primary" size="lg" tabIndex={0} onClick={handleArchiveIssue} loading={isArchiving}>
                    {isArchiving ? t("common.archiving") : t("common.archive")}
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
