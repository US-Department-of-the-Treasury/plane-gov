import { useTranslation } from "@plane/i18n";
// ui
import { SprintIcon } from "@plane/propel/icons";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";

export function WorkspaceActiveSprintHeader() {
  const { t } = useTranslation();
  return (
    <Header>
      <Header.LeftItem>
        <Breadcrumbs>
          <Breadcrumbs.Item
            component={
              <BreadcrumbLink
                label={t("active_sprints")}
                icon={<SprintIcon className="h-4 w-4 text-tertiary rotate-180" />}
              />
            }
          />
        </Breadcrumbs>
      </Header.LeftItem>
    </Header>
  );
}
