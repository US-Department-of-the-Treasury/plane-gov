import type { FC } from "react";

type TUpdateEstimateModal = {
  workspaceSlug: string;
  projectId: string;
  estimateId: string | undefined;
  isOpen: boolean;
  handleClose: () => void;
};

export function UpdateEstimateModal(_props: TUpdateEstimateModal) {
  return <></>;
}
