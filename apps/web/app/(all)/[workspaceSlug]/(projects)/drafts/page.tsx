import Link from "next/link";
// plane imports
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
// components
import { PageHead } from "@/components/core/page-title";
import { WorkspaceDraftIssuesRoot } from "@/components/issues/workspace-draft";
import type { Route } from "./+types/page";

// Tab configuration for Projects / Drafts navigation
const PROJECT_TABS = [
  { key: "projects", labelKey: "projects", href: (ws: string) => `/${ws}/projects/` },
  { key: "drafts", labelKey: "drafts", href: (ws: string) => `/${ws}/drafts/` },
] as const;

function WorkspaceDraftPage({ params }: Route.ComponentProps) {
  const { workspaceSlug } = params;
  const { t } = useTranslation();
  const pageTitle = t("drafts");

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="flex h-full w-full flex-col">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-subtle px-4 py-2">
          {PROJECT_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href(workspaceSlug)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                tab.key === "drafts"
                  ? "bg-layer-2 text-primary"
                  : "text-secondary hover:bg-layer-transparent-hover hover:text-primary"
              )}
            >
              {t(tab.labelKey)}
            </Link>
          ))}
        </div>
        <div className="relative flex-1 overflow-hidden overflow-y-auto">
          <WorkspaceDraftIssuesRoot workspaceSlug={workspaceSlug} />
        </div>
      </div>
    </>
  );
}

export default WorkspaceDraftPage;
