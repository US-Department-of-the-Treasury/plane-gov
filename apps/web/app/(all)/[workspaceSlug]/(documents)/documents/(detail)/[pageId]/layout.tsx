import { Outlet } from "react-router";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { DocumentDetailHeader } from "./header";

export default function DocumentDetailLayout() {
  return (
    <>
      <AppHeader header={<DocumentDetailHeader />} />
      <ContentWrapper className="overflow-hidden">
        <Outlet />
      </ContentWrapper>
    </>
  );
}
