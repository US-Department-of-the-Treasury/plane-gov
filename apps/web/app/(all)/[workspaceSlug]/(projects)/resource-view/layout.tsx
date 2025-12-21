// components
import { Outlet } from "react-router";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
// local imports
import { ResourceViewHeader } from "./header";

export default function ResourceViewLayout() {
  return (
    <>
      <AppHeader header={<ResourceViewHeader />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
