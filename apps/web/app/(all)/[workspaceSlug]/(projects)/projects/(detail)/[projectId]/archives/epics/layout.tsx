import { Outlet } from "react-router";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { ProjectArchivesHeader } from "../header";

export default function ProjectArchiveEpicsLayout() {
  return (
    <>
      <AppHeader header={<ProjectArchivesHeader activeTab="epics" />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
