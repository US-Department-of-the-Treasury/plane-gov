"use client";

import { useParams } from "next/navigation";
// components
import { PageHead } from "@/components/core/page-title";
import { WikiListView } from "@/components/wiki/list";

export default function WikiListPage() {
  const { workspaceSlug } = useParams();

  return (
    <>
      <PageHead title="Wiki" />
      <div className="relative h-full w-full overflow-hidden">
        <WikiListView workspaceSlug={workspaceSlug?.toString() ?? ""} />
      </div>
    </>
  );
}
