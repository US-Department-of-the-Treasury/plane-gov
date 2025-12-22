import { useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TPageVersion } from "@plane/types";
import { Avatar } from "@plane/ui";
import { cn, getFileURL, renderFormattedDate, renderFormattedTime } from "@plane/utils";
// components
import type { TPageRootHandlers } from "@/components/pages/editor/page-root";
// hooks
import { useWorkspaceMembers, getWorkspaceMemberByUserId, getMemberDisplayName } from "@/store/queries/member";
import { useQueryParams } from "@/hooks/use-query-params";
// store
import type { TPageInstance } from "@/store/pages/base-page";
// query keys
import { queryKeys } from "@/store/queries/query-keys";
// local imports
import { PAGE_NAVIGATION_PANE_VERSION_QUERY_PARAM } from "../..";

type Props = {
  page: TPageInstance;
  versionHistory: Pick<TPageRootHandlers, "fetchAllVersions" | "fetchVersionDetails">;
  workspaceSlug: string;
};

type VersionHistoryItemProps = {
  getVersionLink: (versionID: string) => string;
  isVersionActive: boolean;
  version: TPageVersion;
  workspaceSlug: string;
};

function VersionHistoryItem(props: VersionHistoryItemProps) {
  const { getVersionLink, isVersionActive, version, workspaceSlug } = props;
  // store hooks
  const { data: members } = useWorkspaceMembers(workspaceSlug);
  // derived values
  const versionCreator = getWorkspaceMemberByUserId(members, version.owned_by);
  // translation
  const { t } = useTranslation();

  return (
    <li className="relative flex items-center gap-x-4 text-11 font-medium">
      {/* timeline icon */}
      <div className="relative size-6 flex-none grid place-items-center">
        <div className="size-2 rounded-full bg-layer-3" />
      </div>
      {/* end timeline icon */}
      <Link
        href={getVersionLink(version.id)}
        className={cn("block flex-1 hover:bg-layer-transparent-hover rounded-md py-2 px-1", {
          " bg-layer-transparent-selected hover:bg-layer-transparent-selected": isVersionActive,
        })}
      >
        <p className="text-tertiary">
          {renderFormattedDate(version.last_saved_at)}, {renderFormattedTime(version.last_saved_at)}
        </p>
        <p className="mt-1 flex items-center gap-1">
          <Avatar
            size="sm"
            src={getFileURL(versionCreator?.avatar_url ?? "")}
            name={versionCreator ? getMemberDisplayName(versionCreator) : undefined}
            className="shrink-0"
          />
          <span>{versionCreator ? getMemberDisplayName(versionCreator) : t("common.deactivated_user")}</span>
        </p>
      </Link>
    </li>
  );
}

export function PageNavigationPaneInfoTabVersionHistory(props: Props) {
  const { page, versionHistory, workspaceSlug } = props;
  // navigation
  const searchParams = useSearchParams();
  const activeVersion = searchParams.get(PAGE_NAVIGATION_PANE_VERSION_QUERY_PARAM);
  // derived values
  const { id } = page;
  // translation
  const { t } = useTranslation();
  // query params
  const { updateQueryParams } = useQueryParams();
  // fetch all versions
  const { data: versionsList } = useQuery({
    queryKey: queryKeys.pages.versions(id ?? ""),
    queryFn: () => versionHistory.fetchAllVersions(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const getVersionLink = useCallback(
    (versionID?: string) => {
      if (versionID) {
        return updateQueryParams({
          paramsToAdd: { [PAGE_NAVIGATION_PANE_VERSION_QUERY_PARAM]: versionID },
        });
      } else {
        return updateQueryParams({
          paramsToRemove: [PAGE_NAVIGATION_PANE_VERSION_QUERY_PARAM],
        });
      }
    },
    [updateQueryParams]
  );

  return (
    <div>
      <p className="text-11 font-medium text-secondary">{t("page_navigation_pane.tabs.info.version_history.label")}</p>
      <div className="mt-3">
        <ul className="relative">
          {/* timeline line */}
          <div className={cn("absolute left-0 top-0 h-full flex w-6 justify-center")}>
            <div className="w-px bg-layer-3" />
          </div>
          {/* end timeline line */}
          <li className="relative flex items-center gap-x-4 text-11 font-medium">
            {/* timeline icon */}
            <div className="relative size-6 flex-none rounded-full grid place-items-center bg-accent-primary/20">
              <div className="size-2.5 rounded-full bg-accent-primary/40" />
            </div>
            {/* end timeline icon */}
            <Link
              href={getVersionLink()}
              className={cn("flex-1 bg-layer-transparent hover:bg-layer-transparent-hover rounded-md py-2 px-1", {
                "bg-layer-transparent-selected hover:bg-layer-transparent-selected": !activeVersion,
              })}
            >
              {t("page_navigation_pane.tabs.info.version_history.current_version")}
            </Link>
          </li>
          {versionsList?.map((version) => (
            <VersionHistoryItem
              key={version.id}
              getVersionLink={getVersionLink}
              isVersionActive={activeVersion === version.id}
              version={version}
              workspaceSlug={workspaceSlug}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
