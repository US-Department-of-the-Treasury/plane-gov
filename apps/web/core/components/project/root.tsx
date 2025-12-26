import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TProjectAppliedDisplayFilterKeys, TProjectFilters } from "@plane/types";
import { calculateTotalFilters, cn } from "@plane/utils";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useProjects, getProjectIds } from "@/store/queries/project";
import { useProjectFilter } from "@/hooks/store/use-project-filter";
import { useWorkspaceDetails } from "@/store/queries/workspace";
// local imports
import { ProjectAppliedFiltersList } from "./applied-filters";
import { ProjectCardList } from "./card-list";

// Tab configuration for Projects / Drafts navigation
const PROJECT_TABS = [
  { key: "projects", labelKey: "projects", href: (ws: string) => `/${ws}/projects/` },
  { key: "drafts", labelKey: "drafts", href: (ws: string) => `/${ws}/drafts/` },
] as const;

export function ProjectRoot() {
  const { workspaceSlug } = useParams();
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug?.toString());
  const pathname = usePathname();
  const { t } = useTranslation();
  // store
  const { data: projects } = useProjects(workspaceSlug?.toString() ?? "");
  const totalProjectIds = getProjectIds(projects);
  const {
    currentWorkspaceFilters,
    currentWorkspaceAppliedDisplayFilters,
    clearAllFilters,
    clearAllAppliedDisplayFilters,
    updateFilters,
    updateDisplayFilters,
    filteredProjectIds,
  } = useProjectFilter();
  // derived values
  const pageTitle = currentWorkspace?.name
    ? `${currentWorkspace?.name} - ${t("workspace_projects.label", { count: 2 })}`
    : undefined;

  const isArchived = pathname.includes("/archives");

  const allowedDisplayFilters =
    currentWorkspaceAppliedDisplayFilters?.filter((filter) => filter !== "archived_projects") ?? [];

  const handleRemoveFilter = useCallback(
    (key: keyof TProjectFilters, value: string | null) => {
      if (!workspaceSlug) return;
      let newValues = currentWorkspaceFilters?.[key] ?? [];

      if (!value) newValues = [];
      else newValues = newValues.filter((val) => val !== value);

      updateFilters(workspaceSlug.toString(), { [key]: newValues });
    },
    [currentWorkspaceFilters, updateFilters, workspaceSlug]
  );

  const handleRemoveDisplayFilter = useCallback(
    (key: TProjectAppliedDisplayFilterKeys) => {
      if (!workspaceSlug) return;
      updateDisplayFilters(workspaceSlug.toString(), { [key]: false });
    },
    [updateDisplayFilters, workspaceSlug]
  );

  const handleClearAllFilters = useCallback(() => {
    if (!workspaceSlug) return;
    clearAllFilters(workspaceSlug.toString());
    clearAllAppliedDisplayFilters(workspaceSlug.toString());
    if (isArchived) updateDisplayFilters(workspaceSlug.toString(), { archived_projects: true });
  }, [clearAllFilters, clearAllAppliedDisplayFilters, workspaceSlug]);

  useEffect(() => {
    updateDisplayFilters(workspaceSlug.toString(), { archived_projects: isArchived });
  }, [pathname]);

  // Determine active tab based on pathname
  const activeTab = pathname.includes("/drafts") ? "drafts" : "projects";

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="flex h-full w-full flex-col">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-subtle px-4 py-2">
          {PROJECT_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href(workspaceSlug?.toString() ?? "")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === tab.key
                  ? "bg-layer-2 text-primary"
                  : "text-secondary hover:bg-layer-transparent-hover hover:text-primary"
              )}
            >
              {t(tab.labelKey)}
            </Link>
          ))}
        </div>
        {(calculateTotalFilters(currentWorkspaceFilters ?? {}) !== 0 || allowedDisplayFilters.length > 0) && (
          <ProjectAppliedFiltersList
            appliedFilters={currentWorkspaceFilters ?? {}}
            appliedDisplayFilters={allowedDisplayFilters}
            handleClearAllFilters={handleClearAllFilters}
            handleRemoveFilter={handleRemoveFilter}
            handleRemoveDisplayFilter={handleRemoveDisplayFilter}
            filteredProjects={filteredProjectIds?.length ?? 0}
            totalProjects={totalProjectIds?.length ?? 0}
            alwaysAllowEditing
          />
        )}
        <ProjectCardList />
      </div>
    </>
  );
}
