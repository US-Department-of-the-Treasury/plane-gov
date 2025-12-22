import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import type { THomeWidgetProps } from "@plane/types";
import { useHome } from "@/hooks/store/use-home";
import { queryKeys } from "@/store/queries/query-keys";
import { LinkCreateUpdateModal } from "./create-update-link-modal";
import { ProjectLinkList } from "./links";
import { useLinks } from "./use-links";

export function DashboardQuickLinks(props: THomeWidgetProps) {
  const { workspaceSlug } = props;
  const { linkOperations } = useLinks(workspaceSlug);
  const {
    quickLinks: { isLinkModalOpen, toggleLinkModal, linkData, setLinkData, fetchLinks },
  } = useHome();
  const { t } = useTranslation();

  const handleCreateLinkModal = useCallback(() => {
    toggleLinkModal(true);
    setLinkData(undefined);
  }, [toggleLinkModal, setLinkData]);

  useQuery({
    queryKey: [...queryKeys.home.widgets(workspaceSlug?.toString() ?? ""), "links"],
    queryFn: () => fetchLinks(workspaceSlug.toString()),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return (
    <>
      <LinkCreateUpdateModal
        isModalOpen={isLinkModalOpen}
        handleOnClose={() => toggleLinkModal(false)}
        linkOperations={linkOperations}
        preloadedData={linkData}
      />
      <div className="mb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="text-14 font-semibold text-tertiary">{t("home.quick_links.title_plural")}</div>
          <button
            onClick={handleCreateLinkModal}
            className="flex gap-1 text-13 font-medium text-accent-primary my-auto"
          >
            <Plus className="size-4 my-auto" /> <span>{t("home.quick_links.add")}</span>
          </button>
        </div>
        <div className="flex flex-wrap w-full">
          {/* rendering links */}
          <ProjectLinkList workspaceSlug={workspaceSlug} linkOperations={linkOperations} />
        </div>
      </div>
    </>
  );
}
