import React, { useEffect, useRef, useState } from "react";
import { xor } from "lodash-es";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { WORK_ITEM_TRACKER_EVENTS } from "@plane/constants";
// Plane imports
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TBaseIssue, TIssue } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useIssueModal } from "@/hooks/context/use-issue-modal";
import { useIssues } from "@/hooks/store/use-issues";
import { useProject } from "@/hooks/store/use-project";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useIssuesActions } from "@/hooks/use-issues-actions";
import { queryKeys } from "@/store/queries";
import { useProjects } from "@/store/queries/project";
import { useIssue } from "@/store/queries/issue";
// services
import { FileService } from "@/services/file.service";
const fileService = new FileService();
// local imports
import { CreateIssueToastActionItems } from "../create-issue-toast-action-items";
import { DraftIssueLayout } from "./draft-issue-layout";
import { IssueFormRoot } from "./form";
import type { IssueFormProps } from "./form";
import type { IssuesModalProps } from "./modal";

export function CreateUpdateIssueModalBase(props: IssuesModalProps) {
  const {
    data,
    isOpen,
    onClose,
    beforeFormSubmit,
    onSubmit,
    withDraftIssueWrapper = true,
    storeType: issueStoreFromProps,
    isDraft = false,
    fetchIssueDetails = true,
    moveToIssue = false,
    modalTitle,
    primaryButtonText,
    isProjectSelectionDisabled = false,
    showActionItemsOnUpdate = false,
  } = props;
  const issueStoreType = useIssueStoreType();

  const originalStoreType = issueStoreFromProps ?? issueStoreType;
  let storeType = originalStoreType;
  // Fallback to project store if epic store is used in issue modal.
  if (storeType === EIssuesStoreType.EPIC) {
    storeType = EIssuesStoreType.PROJECT;
  }
  // ref
  const issueTitleRef = useRef<HTMLInputElement>(null);
  // states
  const [changesMade, setChangesMade] = useState<Partial<TIssue> | null>(null);
  const [createMore, setCreateMore] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [uploadedAssetIds, setUploadedAssetIds] = useState<string[]>([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  // store hooks
  const { t } = useTranslation();
  const { workspaceSlug, projectId: routerProjectId, sprintId, epicId, workItem } = useParams();
  const queryClient = useQueryClient();
  const { issues } = useIssues(storeType);
  const { issues: projectIssues } = useIssues(EIssuesStoreType.PROJECT);
  const { issues: draftIssues } = useIssues(EIssuesStoreType.WORKSPACE_DRAFT);
  const { allowedProjectIds, handleCreateUpdatePropertyValues, handleCreateSubWorkItem } = useIssueModal();
  // current store details
  const { createIssue, updateIssue } = useIssuesActions(storeType);
  // query hooks
  const { data: projects } = useProjects(workspaceSlug?.toString() ?? "");
  // derived values
  const routerProjectIdentifier = workItem?.toString().split("-")[0];
  const projectIdFromRouter = projects?.find((p) => p.identifier === routerProjectIdentifier)?.id;
  const projectId = data?.project_id ?? routerProjectId?.toString() ?? projectIdFromRouter;

  // Fetch issue details using TanStack Query if we're editing
  const issueIdToFetch = data?.id ?? data?.sourceIssueId;
  const { data: fetchedIssue } = useIssue(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? "",
    issueIdToFetch ?? ""
  );

  useEffect(() => {
    // Set description from fetched issue or data prop
    if (fetchedIssue && fetchIssueDetails) {
      setDescription(fetchedIssue.description_html || "<p></p>");
    } else if (data?.description_html) {
      setDescription(data.description_html);
    } else {
      setDescription("<p></p>");
    }

    // if modal is closed, reset active project to null
    // and return to avoid activeProjectId being set to some other project
    if (!isOpen) {
      setActiveProjectId(null);
    } else {
      // if data is present, set active project to the project of the
      // issue. This has more priority than the project in the url.
      if (data && data.project_id) {
        setActiveProjectId(data.project_id);
      }
      // if data is not present, set active project to the first project in the allowedProjectIds array
      else if (allowedProjectIds && allowedProjectIds.length > 0 && !activeProjectId) {
        setActiveProjectId(projectId?.toString() ?? allowedProjectIds?.[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data?.project_id,
    data?.id,
    data?.sourceIssueId,
    data?.description_html,
    projectId,
    isOpen,
    activeProjectId,
    fetchedIssue,
    fetchIssueDetails,
  ]);

  const addIssueToSprint = async (issue: TIssue, sprintId: string) => {
    if (!workspaceSlug || !issue.project_id) return;

    await issues.addIssueToSprint(workspaceSlug.toString(), issue.project_id, sprintId, [issue.id]);
    // Invalidate sprint queries to refetch updated data
    void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.detail(sprintId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.sprints.all(workspaceSlug.toString(), issue.project_id),
    });
  };

  const addIssueToEpic = async (issue: TIssue, epicIds: string[]) => {
    if (!workspaceSlug || !issue.project_id) return;

    await issues.changeEpicsInIssue(workspaceSlug.toString(), issue.project_id, issue.id, epicIds, []);
    // Invalidate epic queries to refetch updated data
    for (const epicId of epicIds) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.detail(epicId) });
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.epics.all(workspaceSlug.toString(), issue.project_id),
    });
  };

  const handleCreateMoreToggleChange = (value: boolean) => {
    setCreateMore(value);
  };

  const handleClose = (saveAsDraft?: boolean) => {
    if (changesMade && saveAsDraft && !data) {
      handleCreateIssue(changesMade, true);
    }

    setActiveProjectId(null);
    setChangesMade(null);
    onClose();
    handleDuplicateIssueModal(false);
  };

  const handleCreateIssue = async (
    payload: Partial<TIssue>,
    is_draft_issue: boolean = false
  ): Promise<TIssue | undefined> => {
    if (!workspaceSlug || !payload.project_id) return;

    try {
      let response: TIssue | undefined;
      // if draft issue, use draft issue store to create issue
      if (is_draft_issue) {
        response = (await draftIssues.createIssue(workspaceSlug.toString(), payload)) as TIssue;
      }
      // if sprint id in payload does not match the sprintId in url
      // or if the epicIds in Payload does not match the epicId in url
      // use the project issue store to create issues
      else if (
        (payload.sprint_id !== sprintId && storeType === EIssuesStoreType.SPRINT) ||
        (!payload.epic_ids?.includes(epicId?.toString()) && originalStoreType === EIssuesStoreType.EPIC)
      ) {
        response = await projectIssues.createIssue(workspaceSlug.toString(), payload.project_id, payload);
      } // else just use the existing store type's create method
      else if (createIssue) {
        response = await createIssue(payload.project_id, payload);
      }

      // update uploaded assets' status
      if (uploadedAssetIds.length > 0) {
        await fileService.updateBulkProjectAssetsUploadStatus(
          workspaceSlug?.toString() ?? "",
          response?.project_id ?? "",
          response?.id ?? "",
          {
            asset_ids: uploadedAssetIds,
          }
        );
        setUploadedAssetIds([]);
      }

      if (!response) throw new Error();

      // check if we should add issue to sprint/epic
      if (!is_draft_issue) {
        if (
          payload.sprint_id &&
          payload.sprint_id !== "" &&
          (payload.sprint_id !== sprintId || storeType !== EIssuesStoreType.SPRINT)
        ) {
          await addIssueToSprint(response, payload.sprint_id);
        }
        if (
          payload.epic_ids &&
          payload.epic_ids.length > 0 &&
          (!payload.epic_ids.includes(epicId?.toString()) || originalStoreType !== EIssuesStoreType.EPIC)
        ) {
          await addIssueToEpic(response, payload.epic_ids);
        }
      }

      // add other property values
      if (response.id && response.project_id) {
        await handleCreateUpdatePropertyValues({
          issueId: response.id,
          issueTypeId: response.type_id,
          projectId: response.project_id,
          workspaceSlug: workspaceSlug?.toString(),
          isDraft: is_draft_issue,
        });

        // create sub work item
        await handleCreateSubWorkItem({
          workspaceSlug: workspaceSlug?.toString(),
          projectId: response.project_id,
          parentId: response.id,
        });
      }

      // Invalidate TanStack Query cache for issue lists so UI updates immediately
      if (!is_draft_issue && response.project_id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.issues.all(workspaceSlug.toString(), response.project_id),
        });
        // Also invalidate the paginated list queries (used by issue list views)
        void queryClient.invalidateQueries({
          queryKey: ["issues", "list", "project", workspaceSlug.toString(), response.project_id],
        });
      }

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("success"),
        message: `${is_draft_issue ? t("draft_created") : t("issue_created_successfully")} `,
        actionItems: !is_draft_issue && response?.project_id && (
          <CreateIssueToastActionItems
            workspaceSlug={workspaceSlug.toString()}
            projectId={response?.project_id}
            issueId={response.id}
          />
        ),
      });
      captureSuccess({
        eventName: WORK_ITEM_TRACKER_EVENTS.create,
        payload: { id: response.id },
      });
      if (!createMore) handleClose();
      if (createMore && issueTitleRef) issueTitleRef?.current?.focus();
      setDescription("<p></p>");
      setChangesMade(null);
      return response;
    } catch (error: any) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: error?.error ?? t(is_draft_issue ? "draft_creation_failed" : "issue_creation_failed"),
      });
      captureError({
        eventName: WORK_ITEM_TRACKER_EVENTS.create,
        payload: { id: payload.id },
        error: error as Error,
      });
      throw error;
    }
  };

  const handleUpdateIssue = async (payload: Partial<TIssue>): Promise<TIssue | undefined> => {
    if (!workspaceSlug || !payload.project_id || !data?.id) return;

    try {
      if (isDraft) await draftIssues.updateIssue(workspaceSlug.toString(), data.id, payload);
      else if (updateIssue) await updateIssue(payload.project_id, data.id, payload);

      // check if we should add/remove issue to/from sprint
      if (
        payload.sprint_id &&
        payload.sprint_id !== "" &&
        (payload.sprint_id !== sprintId || storeType !== EIssuesStoreType.SPRINT)
      ) {
        await addIssueToSprint(data as TBaseIssue, payload.sprint_id);
      }
      if (data.sprint_id && !payload.sprint_id && data.project_id) {
        await issues.removeIssueFromSprint(workspaceSlug.toString(), data.project_id, data.sprint_id, data.id);
        // Invalidate sprint queries to refetch updated data
        void queryClient.invalidateQueries({ queryKey: queryKeys.sprints.detail(data.sprint_id) });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.sprints.all(workspaceSlug.toString(), data.project_id),
        });
      }

      if (data.epic_ids && payload.epic_ids && data.project_id) {
        const updatedEpicIds = xor(data.epic_ids, payload.epic_ids);
        const epicsToAdd: string[] = [];
        const epicsToRemove: string[] = [];

        for (const epicId of updatedEpicIds) {
          if (data.epic_ids.includes(epicId)) {
            epicsToRemove.push(epicId);
          } else {
            epicsToAdd.push(epicId);
          }
        }
        await issues.changeEpicsInIssue(workspaceSlug.toString(), data.project_id, data.id, epicsToAdd, epicsToRemove);
      }

      // add other property values
      await handleCreateUpdatePropertyValues({
        issueId: data.id,
        issueTypeId: payload.type_id,
        projectId: payload.project_id,
        workspaceSlug: workspaceSlug?.toString(),
        isDraft: isDraft,
      });

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("success"),
        message: t("issue_updated_successfully"),
        actionItems:
          showActionItemsOnUpdate && payload.project_id ? (
            <CreateIssueToastActionItems
              workspaceSlug={workspaceSlug.toString()}
              projectId={payload.project_id}
              issueId={data.id}
            />
          ) : undefined,
      });
      captureSuccess({
        eventName: WORK_ITEM_TRACKER_EVENTS.update,
        payload: { id: data.id },
      });
      handleClose();
    } catch (error: any) {
      console.error(error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: error?.error ?? t("issue_could_not_be_updated"),
      });
      captureError({
        eventName: WORK_ITEM_TRACKER_EVENTS.update,
        payload: { id: data.id },
        error: error as Error,
      });
    }
  };

  const handleFormSubmit = async (payload: Partial<TIssue>, is_draft_issue: boolean = false) => {
    if (!workspaceSlug || !payload.project_id || !storeType) return;
    // remove sourceIssueId from payload since it is not needed
    if (data?.sourceIssueId) delete data.sourceIssueId;

    let response: TIssue | undefined = undefined;

    try {
      if (beforeFormSubmit) await beforeFormSubmit();
      if (!data?.id) response = await handleCreateIssue(payload, is_draft_issue);
      else response = await handleUpdateIssue(payload);
    } finally {
      if (response != undefined && onSubmit) await onSubmit(response);
    }
  };

  const handleFormChange = (formData: Partial<TIssue> | null) => setChangesMade(formData);

  const handleUpdateUploadedAssetIds = (assetId: string) => setUploadedAssetIds((prev) => [...prev, assetId]);

  const handleDuplicateIssueModal = (value: boolean) => setIsDuplicateModalOpen(value);

  // don't open the modal if there are no projects
  if (!allowedProjectIds || allowedProjectIds.length === 0 || !activeProjectId) return null;

  const commonIssueModalProps: IssueFormProps = {
    issueTitleRef: issueTitleRef,
    data: {
      ...data,
      description_html: description,
      sprint_id: data?.sprint_id ? data?.sprint_id : sprintId ? sprintId.toString() : null,
      epic_ids: data?.epic_ids ? data?.epic_ids : epicId ? [epicId.toString()] : null,
    },
    onAssetUpload: handleUpdateUploadedAssetIds,
    onClose: handleClose,
    onSubmit: (payload) => handleFormSubmit(payload, isDraft),
    projectId: activeProjectId,
    isCreateMoreToggleEnabled: createMore,
    onCreateMoreToggleChange: handleCreateMoreToggleChange,
    isDraft: isDraft,
    moveToIssue: moveToIssue,
    modalTitle: modalTitle,
    primaryButtonText: primaryButtonText,
    isDuplicateModalOpen: isDuplicateModalOpen,
    handleDuplicateIssueModal: handleDuplicateIssueModal,
    isProjectSelectionDisabled: isProjectSelectionDisabled,
  };

  return (
    <ModalCore
      isOpen={isOpen}
      position={EModalPosition.TOP}
      width={isDuplicateModalOpen ? EModalWidth.VIXL : EModalWidth.XXXXL}
      className="!bg-transparent rounded-lg shadow-none transition-[width] ease-linear"
    >
      {withDraftIssueWrapper ? (
        <DraftIssueLayout {...commonIssueModalProps} changesMade={changesMade} onChange={handleFormChange} />
      ) : (
        <IssueFormRoot {...commonIssueModalProps} />
      )}
    </ModalCore>
  );
}
