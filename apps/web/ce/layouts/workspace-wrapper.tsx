import type { FC } from "react";
// layouts
import { WorkspaceAuthWrapper as CoreWorkspaceAuthWrapper } from "@/layouts/auth-layout/workspace-wrapper";

export type IWorkspaceAuthWrapper = {
  children: React.ReactNode;
};

export function WorkspaceAuthWrapper(props: IWorkspaceAuthWrapper) {
  // props
  const { children } = props;

  return <CoreWorkspaceAuthWrapper>{children}</CoreWorkspaceAuthWrapper>;
}
