import { observer } from "mobx-react";
import { Users } from "lucide-react";
import { useTranslation } from "@plane/i18n";
// ui
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";

export const ResourceViewHeader = observer(function ResourceViewHeader() {
  const { t } = useTranslation();
  return (
    <Header>
      <Header.LeftItem>
        <Breadcrumbs>
          <Breadcrumbs.Item
            component={<BreadcrumbLink label={t("resource_view")} icon={<Users className="h-4 w-4 text-tertiary" />} />}
          />
        </Breadcrumbs>
      </Header.LeftItem>
    </Header>
  );
});
