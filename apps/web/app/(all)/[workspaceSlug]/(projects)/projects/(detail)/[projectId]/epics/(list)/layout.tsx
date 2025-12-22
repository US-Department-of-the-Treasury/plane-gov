import { Outlet } from "react-router";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { EpicsListHeader } from "./header";
import { EpicsListMobileHeader } from "./mobile-header";

export default function ProjectEpicsListLayout() {
  return (
    <>
      <AppHeader header={<EpicsListHeader />} mobileHeader={<EpicsListMobileHeader />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
