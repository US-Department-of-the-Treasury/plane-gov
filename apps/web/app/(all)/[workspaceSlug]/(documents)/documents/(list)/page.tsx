"use client";

import { useParams } from "next/navigation";
// components
import { PageHead } from "@/components/core/page-title";
import { DocumentListView } from "@/components/documents/list";

export default function DocumentListPage() {
  const { workspaceSlug } = useParams();

  return (
    <>
      <PageHead title="Documents" />
      <div className="relative h-full w-full overflow-hidden">
        <DocumentListView workspaceSlug={workspaceSlug?.toString() ?? ""} />
      </div>
    </>
  );
}
