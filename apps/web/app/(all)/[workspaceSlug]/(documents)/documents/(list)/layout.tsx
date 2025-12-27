import { Outlet } from "react-router";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { DocumentListHeader } from "./header";

export default function DocumentListLayout() {
  return (
    <>
      <AppHeader header={<DocumentListHeader />} />
      <ContentWrapper>
        <Outlet />
      </ContentWrapper>
    </>
  );
}
