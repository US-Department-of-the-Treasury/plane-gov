"use client";

import { useParams } from "next/navigation";
// components
import { PageHead } from "@/components/core/page-title";
import { RecentDocumentsView } from "@/components/documents/list";

export default function RecentDocumentsPage() {
  const { workspaceSlug } = useParams();

  return (
    <>
      <PageHead title="Recent Documents" />
      <div className="relative h-full w-full overflow-hidden">
        <RecentDocumentsView workspaceSlug={workspaceSlug?.toString() ?? ""} />
      </div>
    </>
  );
}
