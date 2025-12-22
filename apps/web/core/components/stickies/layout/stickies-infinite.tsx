import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { STICKIES_PER_PAGE } from "@plane/constants";
import { ContentWrapper, Loader } from "@plane/ui";
import { cn } from "@plane/utils";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useSticky } from "@/hooks/use-stickies";
import { queryKeys } from "@/store/queries/query-keys";
import { StickiesLayout } from "./stickies-list";

export function StickiesInfinite() {
  const { workspaceSlug } = useParams();
  // hooks
  const { fetchWorkspaceStickies, fetchNextWorkspaceStickies, getWorkspaceStickyIds, loader, paginationInfo } =
    useSticky();
  //state
  const [elementRef, setElementRef] = useState<HTMLDivElement | null>(null);

  // ref
  const containerRef = useRef<HTMLDivElement>(null);

  useQuery({
    queryKey: queryKeys.stickies.all(workspaceSlug?.toString() ?? "", "", undefined),
    queryFn: () => fetchWorkspaceStickies(),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const handleLoadMore = () => {
    if (loader === "pagination") return;
    fetchNextWorkspaceStickies(workspaceSlug?.toString());
  };

  const hasNextPage = paginationInfo?.next_page_results && paginationInfo?.next_cursor !== undefined;
  const shouldObserve = hasNextPage && loader !== "pagination";
  const workspaceStickies = getWorkspaceStickyIds(workspaceSlug?.toString());
  useIntersectionObserver(containerRef, shouldObserve ? elementRef : null, handleLoadMore);

  return (
    <ContentWrapper ref={containerRef} className="space-y-4">
      <StickiesLayout
        workspaceSlug={workspaceSlug.toString()}
        intersectionElement={
          hasNextPage &&
          workspaceStickies?.length >= STICKIES_PER_PAGE && (
            <div
              className={cn("flex min-h-[300px] box-border p-2 w-full")}
              ref={setElementRef}
              id="intersection-element"
            >
              <div className="flex w-full rounded-sm min-h-[300px]">
                <Loader className="w-full h-full">
                  <Loader.Item height="100%" width="100%" />
                </Loader>
              </div>
            </div>
          )
        }
      />
    </ContentWrapper>
  );
}
