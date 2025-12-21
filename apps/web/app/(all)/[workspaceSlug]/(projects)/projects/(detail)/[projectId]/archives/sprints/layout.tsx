import { Outlet } from "react-router";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { ProjectArchivesHeader } from "../header";

export default function ProjectArchiveSprintsLayout() {
  return (
    <>
      <AppHeader header={<ProjectArchivesHeader activeTab="sprints" />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
