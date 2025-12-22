import { Outlet } from "react-router";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { WikiDetailHeader } from "./header";

export default function WikiDetailLayout() {
  return (
    <>
      <AppHeader header={<WikiDetailHeader />} />
      <ContentWrapper className="overflow-hidden">
        <Outlet />
      </ContentWrapper>
    </>
  );
}
