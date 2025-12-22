import type { ReactNode } from "react";
// plane imports
import type { EProjectFeatureKey } from "@plane/constants";
import { Breadcrumbs } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import type { TNavigationItem } from "@/components/workspace/sidebar/project-navigation";
// hooks
import { useProjects, getProjectById } from "@/store/queries/project";
// local imports
import { getProjectFeatureNavigation } from "../projects/navigation/helper";

type TProjectFeatureBreadcrumbProps = {
  workspaceSlug: string;
  projectId: string;
  featureKey: EProjectFeatureKey;
  isLast?: boolean;
  additionalNavigationItems?: TNavigationItem[];
};

export function ProjectFeatureBreadcrumb(props: TProjectFeatureBreadcrumbProps) {
  const { workspaceSlug, projectId, featureKey, isLast = false, additionalNavigationItems } = props;
  // store hooks
  const { data: projects } = useProjects(workspaceSlug);
  // derived values
  const project = getProjectById(projects, projectId);

  if (!project) return null;

  const navigationItems = getProjectFeatureNavigation(workspaceSlug, projectId, project);

  // if additional navigation items are provided, add them to the navigation items
  const allNavigationItems = [...(additionalNavigationItems || []), ...navigationItems];

  const currentNavigationItem = allNavigationItems.find((item) => item.key === featureKey);
  const icon = currentNavigationItem?.icon as ReactNode;
  const name = currentNavigationItem?.name;
  const href = currentNavigationItem?.href;

  return (
    <>
      <Breadcrumbs.Item
        component={
          <BreadcrumbLink
            key={featureKey}
            label={name}
            isLast={isLast}
            href={href}
            icon={<Breadcrumbs.Icon>{icon}</Breadcrumbs.Icon>}
          />
        }
        showSeparator={false}
        isLast={isLast}
      />
    </>
  );
}
