import { Outlet } from "react-router";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { SprintIssuesHeader } from "./header";
import { SprintIssuesMobileHeader } from "./mobile-header";

export default function ProjectSprintIssuesLayout() {
  return (
    <>
      <AppHeader header={<SprintIssuesHeader />} mobileHeader={<SprintIssuesMobileHeader />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
