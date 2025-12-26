import { Outlet } from "react-router";
// components
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
// local imports
import { ResourcesHeader } from "./header";

export default function ResourcesLayout() {
  return (
    <>
      <AppHeader header={<ResourcesHeader />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
