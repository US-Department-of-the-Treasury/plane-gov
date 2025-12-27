import { useParams } from "next/navigation";
// plane imports
import { PageIcon } from "@plane/propel/icons";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
// queries
import { useProjectDetails } from "@/store/queries/project";
import { useWikiPageDetails } from "@/store/queries";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";

export function PageDetailsHeader() {
  // router
  const { workspaceSlug, pageId, projectId } = useParams();
  // queries
  const { isLoading: isProjectLoading } = useProjectDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  const { data: page, isLoading: isPageLoading } = useWikiPageDetails(
    workspaceSlug?.toString() ?? "",
    pageId?.toString() ?? ""
  );

  const isLoading = isProjectLoading || isPageLoading;

  return (
    <Header>
      <Header.LeftItem>
        <Breadcrumbs isLoading={isLoading}>
          <CommonProjectBreadcrumbs workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
          <Breadcrumbs.Item
            component={
              <BreadcrumbLink
                label="Wiki"
                href={`/${workspaceSlug}/projects/${projectId}/pages/`}
                icon={<PageIcon className="h-4 w-4 text-tertiary" />}
              />
            }
          />
          {page && (
            <Breadcrumbs.Item
              component={
                <BreadcrumbLink
                  label={page.name || "Untitled"}
                  href={`/${workspaceSlug}/projects/${projectId}/pages/${pageId}`}
                  icon={
                    page.logo_props?.in_use ? (
                      <Logo logo={page.logo_props} size={16} type="lucide" />
                    ) : (
                      <PageIcon className="h-4 w-4 text-tertiary" />
                    )
                  }
                  isLast
                />
              }
              isLast
            />
          )}
        </Breadcrumbs>
      </Header.LeftItem>
    </Header>
  );
}
