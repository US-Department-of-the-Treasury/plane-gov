import { Controller, useFormContext } from "react-hook-form";
// plane imports
import { NETWORK_CHOICES, ETabIndices } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Tooltip } from "@plane/propel/tooltip";
import type { IProject } from "@plane/types";
import { CustomSelect } from "@plane/ui";
import { getTabIndex } from "@plane/utils";
// components
import { MemberCombobox } from "@/components/dropdowns/member/member-combobox";
import { ProjectNetworkIcon } from "@/components/project/project-network-icon";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";

type Props = {
  isMobile?: boolean;
};

function ProjectAttributes(props: Props) {
  const { isMobile = false } = props;
  const { t } = useTranslation();
  const { control } = useFormContext<IProject>();
  const { getIndex } = getTabIndex(ETabIndices.PROJECT_CREATE, isMobile);
  const { isMobile: isMobileDevice } = usePlatformOS();

  // Filter out disabled options for selection
  const selectableNetworkChoices = NETWORK_CHOICES.filter((n) => !n.disabled);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Controller
        name="network"
        control={control}
        render={({ field: { onChange, value } }) => {
          const currentNetwork = NETWORK_CHOICES.find((n) => n.key === value);

          return (
            <div className="flex-shrink-0 h-7" tabIndex={getIndex("network")}>
              <CustomSelect
                value={value}
                onChange={onChange}
                label={
                  <div className="flex items-center gap-1 h-full">
                    {currentNetwork ? (
                      <>
                        <ProjectNetworkIcon iconKey={currentNetwork.iconKey} />
                        {t(currentNetwork.i18n_label)}
                      </>
                    ) : (
                      <span className="text-placeholder">{t("select_network")}</span>
                    )}
                  </div>
                }
                placement="bottom-start"
                className="h-full"
                buttonClassName="h-full"
                noChevron
                tabIndex={getIndex("network")}
              >
                {selectableNetworkChoices.map((network) => (
                  <CustomSelect.Option key={network.key} value={network.key}>
                    <div className="flex items-start gap-2">
                      <ProjectNetworkIcon iconKey={network.iconKey} className="h-3.5 w-3.5" />
                      <div className="-mt-1">
                        <p>{t(network.i18n_label)}</p>
                        <p className="text-11 text-placeholder">{t(network.description)}</p>
                      </div>
                    </div>
                  </CustomSelect.Option>
                ))}
                {/* Show disabled options with tooltip */}
                {NETWORK_CHOICES.filter((n) => n.disabled).map((network) => (
                  <Tooltip
                    key={network.key}
                    tooltipContent={t("workspace_projects.network.public.disabled_tooltip")}
                    isMobile={isMobileDevice}
                    position="right"
                  >
                    <div className="cursor-not-allowed select-none truncate rounded-sm px-1 py-1.5 text-placeholder flex items-center justify-between gap-2 opacity-50">
                      <div className="flex items-start gap-2">
                        <ProjectNetworkIcon iconKey={network.iconKey} className="h-3.5 w-3.5" />
                        <div className="-mt-1">
                          <p>{t(network.i18n_label)}</p>
                          <p className="text-11 text-placeholder">{t(network.description)}</p>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                ))}
              </CustomSelect>
            </div>
          );
        }}
      />
      <Controller
        name="project_lead"
        control={control}
        render={({ field: { value, onChange } }) => {
          if (value === undefined || value === null || typeof value === "string")
            return (
              <div className="flex-shrink-0 h-7" tabIndex={getIndex("lead")}>
                <MemberCombobox
                  value={value ?? null}
                  onChange={(lead) => onChange(lead === value ? null : lead)}
                  placeholder={t("lead")}
                  multiple={false}
                  buttonVariant="border-with-text"
                  tabIndex={getIndex("lead")}
                  showUserDetails
                />
              </div>
            );
          else return <></>;
        }}
      />
    </div>
  );
}

export default ProjectAttributes;

export { ProjectAttributes };
