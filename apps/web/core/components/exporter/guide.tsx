import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/store/queries/query-keys";
import { ExportForm } from "./export-form";
import { PrevExports } from "./prev-exports";

function IntegrationGuide() {
  // router
  const { workspaceSlug } = useParams();
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");
  const queryClient = useQueryClient();
  // state
  const per_page = 10;
  const [cursor, setCursor] = useState<string | undefined>(`10:0:0`);

  const handleMutateServices = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.exporter.services(workspaceSlug?.toString() ?? "", cursor ?? "", `${per_page}`),
    });
  };

  return (
    <>
      <div className="h-full w-full">
        <>
          <ExportForm workspaceSlug={workspaceSlug} provider={provider} mutateServices={handleMutateServices} />
          <PrevExports workspaceSlug={workspaceSlug} cursor={cursor} per_page={per_page} setCursor={setCursor} />
        </>
      </div>
    </>
  );
}

export default IntegrationGuide;
