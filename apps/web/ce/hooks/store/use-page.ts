// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePageStore } from "@/plane-web/hooks/store";

export type TArgs = {
  pageId: string;
  storeType: EPageStoreType;
};

/**
 * Hook to get a specific page by ID.
 *
 * @deprecated Use useProjectPageStore hook directly in new code
 */
export const usePage = (args: TArgs) => {
  const { pageId, storeType } = args;
  // store hooks
  const pageStore = usePageStore(storeType);

  if (!pageId) throw new Error("pageId is required");

  return pageStore.getPageById(pageId);
};
