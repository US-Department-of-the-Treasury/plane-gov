type TCommonProjectBreadcrumbProps = {
  workspaceSlug: string;
  projectId: string;
};

/**
 * In horizontal/tabbed navigation mode, the project breadcrumb is not shown
 * because the tab navigation already provides context.
 */
export function CommonProjectBreadcrumbs(_props: TCommonProjectBreadcrumbProps) {
  return null;
}
