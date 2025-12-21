import type { FC } from "react";
import React from "react";
import { observer } from "mobx-react";
import { EPIC_STATUS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import type { TEpicStatus } from "@plane/propel/icons";
import { ModuleStatusIcon } from "@plane/propel/icons";
import type { IEpic } from "@plane/types";
import { CustomSelect } from "@plane/ui";

type Props = {
  isDisabled: boolean;
  epicDetails: IEpic;
  handleEpicDetailsChange: (payload: Partial<IEpic>) => Promise<void>;
};

export const EpicStatusDropdown = observer(function EpicStatusDropdown(props: Props) {
  const { isDisabled, epicDetails, handleEpicDetailsChange } = props;
  const { t } = useTranslation();
  const epicStatus = EPIC_STATUS.find((status) => status.value === epicDetails.status);

  if (!epicStatus) return <></>;

  return (
    <CustomSelect
      customButton={
        <span
          className={`flex h-6 w-20 items-center justify-center rounded-sm text-center text-11 ${
            isDisabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
          style={{
            color: epicStatus ? epicStatus.color : "#a3a3a2",
            backgroundColor: epicStatus ? `${epicStatus.color}20` : "#a3a3a220",
          }}
        >
          {(epicStatus && t(epicStatus?.i18n_label)) ?? t("project_epics.status.backlog")}
        </span>
      }
      value={epicStatus?.value}
      onChange={(val: TEpicStatus) => {
        handleEpicDetailsChange({ status: val });
      }}
      disabled={isDisabled}
    >
      {EPIC_STATUS.map((status) => (
        <CustomSelect.Option key={status.value} value={status.value}>
          <div className="flex items-center gap-2">
            <ModuleStatusIcon status={status.value} />
            {t(status.i18n_label)}
          </div>
        </CustomSelect.Option>
      ))}
    </CustomSelect>
  );
});
