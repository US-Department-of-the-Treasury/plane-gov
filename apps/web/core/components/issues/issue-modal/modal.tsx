import React from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import type { EIssuesStoreType, TIssue } from "@plane/types";
// plane web imports
import { IssueModalProvider } from "@/plane-web/components/issues/issue-modal/provider";
import { CreateUpdateIssueModalBase } from "./base";

export interface IssuesModalProps {
  data?: Partial<TIssue>;
  isOpen: boolean;
  onClose: () => void;
  beforeFormSubmit?: () => Promise<void>;
  onSubmit?: (res: TIssue) => Promise<void>;
  withDraftIssueWrapper?: boolean;
  storeType?: EIssuesStoreType;
  isDraft?: boolean;
  fetchIssueDetails?: boolean;
  moveToIssue?: boolean;
  modalTitle?: string;
  primaryButtonText?: {
    default: string;
    loading: string;
  };
  isProjectSelectionDisabled?: boolean;
  templateId?: string;
  allowedProjectIds?: string[];
  showActionItemsOnUpdate?: boolean;
}

export const CreateUpdateIssueModal = observer(function CreateUpdateIssueModal(props: IssuesModalProps) {
  // router params
  const { sprintId, epicId } = useParams();
  // derived values
  const dataForPreload = {
    ...props.data,
    sprint_id: props.data?.sprint_id ? props.data?.sprint_id : sprintId ? sprintId.toString() : null,
    epic_ids: props.data?.epic_ids ? props.data?.epic_ids : epicId ? [epicId.toString()] : null,
  };

  if (!props.isOpen) return null;
  return (
    <IssueModalProvider
      templateId={props.templateId}
      dataForPreload={dataForPreload}
      allowedProjectIds={props.allowedProjectIds}
    >
      <CreateUpdateIssueModalBase {...props} />
    </IssueModalProvider>
  );
});
