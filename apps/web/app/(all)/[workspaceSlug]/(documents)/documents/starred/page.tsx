"use client";

import { useParams } from "next/navigation";
// components
import { PageHead } from "@/components/core/page-title";
import { StarredDocumentsView } from "@/components/documents/list";

export default function StarredDocumentsPage() {
  const { workspaceSlug } = useParams();

  return (
    <>
      <PageHead title="Starred Documents" />
      <div className="relative h-full w-full overflow-hidden">
        <StarredDocumentsView workspaceSlug={workspaceSlug?.toString() ?? ""} />
      </div>
    </>
  );
}
