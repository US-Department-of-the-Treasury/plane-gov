import React from "react";
import { useParams } from "next/navigation";
import { EUserPermissionsLevel } from "@plane/constants";
import type { IIssueLabel } from "@plane/types";
import { EUserPermissions } from "@plane/types";
// hooks
import { useProjectLabels, useCreateLabel } from "@/store/queries/label";
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import type { TWorkItemLabelSelectBaseProps } from "./base";
import { WorkItemLabelSelectBase } from "./base";

type TWorkItemLabelSelectProps = Omit<TWorkItemLabelSelectBaseProps, "labelIds" | "getLabelById" | "onDropdownOpen"> & {
  projectId: string | undefined;
};

export function IssueLabelSelect(props: TWorkItemLabelSelectProps) {
  const { projectId } = props;
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const { allowPermissions } = useUserPermissions();
  const { data: projectLabels } = useProjectLabels(workspaceSlug?.toString() ?? "", projectId ?? "");
  const { mutateAsync: createLabelMutation } = useCreateLabel();

  // derived values
  const canCreateLabel =
    projectId &&
    allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug?.toString(), projectId);

  const getLabelById = (labelId: string) => projectLabels?.find((l) => l.id === labelId) ?? null;

  const onDropdownOpen = () => {
    // TanStack Query handles fetching automatically - no manual fetch needed
  };

  const handleCreateLabel = (data: Partial<IIssueLabel>) => {
    if (!workspaceSlug || !projectId) {
      throw new Error("Workspace slug or project ID is missing");
    }
    return createLabelMutation({
      workspaceSlug: workspaceSlug.toString(),
      projectId,
      data,
    });
  };

  return (
    <WorkItemLabelSelectBase
      {...props}
      getLabelById={getLabelById}
      labelIds={projectLabels?.map((l) => l.id) ?? []}
      onDropdownOpen={onDropdownOpen}
      createLabel={handleCreateLabel}
      createLabelEnabled={!!canCreateLabel}
    />
  );
}
