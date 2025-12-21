// components
import { Outlet } from "react-router";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
// local imports
import { WorkspaceActiveSprintHeader } from "./header";

export default function WorkspaceActiveSprintLayout() {
  return (
    <>
      <AppHeader header={<WorkspaceActiveSprintHeader />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
