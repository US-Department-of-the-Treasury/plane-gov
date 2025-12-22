import { EPIC_VIEW_LAYOUTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ChevronDownIcon } from "@plane/propel/icons";
import { CustomMenu, Row } from "@plane/ui";
import { EpicLayoutIcon } from "@/components/epics";
import { useEpicFilter } from "@/hooks/store/use-epic-filter";
import { useProject } from "@/hooks/store/use-project";

export function EpicsListMobileHeader() {
  const { currentProjectDetails } = useProject();
  const { updateDisplayFilters } = useEpicFilter();
  const { t } = useTranslation();

  return (
    <div className="flex justify-start md:hidden">
      <CustomMenu
        maxHeight={"md"}
        className="flex flex-grow justify-start text-secondary text-13 py-2 border-b border-subtle bg-surface-1"
        // placement="bottom-start"
        customButton={
          <Row className="flex flex-grow justify-center text-secondary text-13 gap-2">
            <span>Layout</span> <ChevronDownIcon className="h-4 w-4 text-secondary my-auto" strokeWidth={1} />
          </Row>
        }
        customButtonClassName="flex flex-grow justify-center items-center text-secondary text-13"
        closeOnSelect
      >
        {EPIC_VIEW_LAYOUTS.map((layout) => {
          if (layout.key == "gantt") return;
          return (
            <CustomMenu.MenuItem
              key={layout.key}
              onClick={() => {
                updateDisplayFilters(currentProjectDetails!.id.toString(), { layout: layout.key });
              }}
              className="flex items-center gap-2"
            >
              <EpicLayoutIcon layoutType={layout.key} />
              <div className="text-tertiary">{t(layout.i18n_title)}</div>
            </CustomMenu.MenuItem>
          );
        })}
      </CustomMenu>
    </div>
  );
}
