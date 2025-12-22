import { Outlet } from "react-router";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { EpicIssuesHeader } from "./header";
import { EpicIssuesMobileHeader } from "./mobile-header";

export default function ProjectEpicIssuesLayout() {
  return (
    <>
      <AppHeader header={<EpicIssuesHeader />} mobileHeader={<EpicIssuesMobileHeader />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
