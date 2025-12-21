import { Outlet } from "react-router";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { SprintsListHeader } from "./header";
import { SprintsListMobileHeader } from "./mobile-header";

export default function ProjectSprintsListLayout() {
  return (
    <>
      <AppHeader header={<SprintsListHeader />} mobileHeader={<SprintsListMobileHeader />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
