import React from "react";
import { Plus } from "lucide-react";
// store
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";

type Props = {
  customButton?: React.ReactNode;
  disabled?: boolean;
};

export function IssueLinksActionButton(props: Props) {
  const { customButton, disabled = false } = props;
  // store hooks
  const toggleIssueLinkModal = useIssueDetailUIStore((s) => s.toggleIssueLinkModal);

  // handlers
  const handleOnClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleIssueLinkModal(true);
  };

  return (
    <button type="button" onClick={handleOnClick} disabled={disabled}>
      {customButton ? customButton : <Plus className="h-4 w-4" />}
    </button>
  );
}
