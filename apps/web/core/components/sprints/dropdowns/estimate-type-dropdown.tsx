import React from "react";
import type { TSprintEstimateType } from "@plane/types";
import { EEstimateSystem } from "@plane/types";
import { CustomSelect } from "@plane/ui";
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useSprintDetails } from "@/store/queries/sprint";
// local imports
import { sprintEstimateOptions } from "../analytics-sidebar/issue-progress";

type TProps = {
  value: TSprintEstimateType;
  onChange: (value: TSprintEstimateType) => Promise<void>;
  showDefault?: boolean;
  projectId: string;
  sprintId: string;
  workspaceSlug?: string;
};

export function EstimateTypeDropdown(props: TProps) {
  const { value, onChange, projectId, sprintId, showDefault = false, workspaceSlug = "" } = props;
  const { data: sprintData } = useSprintDetails(workspaceSlug, projectId, sprintId);
  const isPointsDataAvailable = !!(sprintData?.estimate_distribution || sprintData?.total_estimate_points);
  const { areEstimateEnabledByProjectId, currentProjectEstimateType } = useProjectEstimates();
  const isCurrentProjectEstimateEnabled = projectId && areEstimateEnabledByProjectId(projectId) ? true : false;
  return (isPointsDataAvailable || isCurrentProjectEstimateEnabled) &&
    currentProjectEstimateType !== EEstimateSystem.CATEGORIES ? (
    <div className="relative flex items-center gap-2">
      <CustomSelect
        value={value}
        label={<span>{sprintEstimateOptions.find((v) => v.value === value)?.label ?? "None"}</span>}
        onChange={onChange}
        maxHeight="lg"
        buttonClassName="bg-surface-2 border-none rounded-sm text-13 font-medium "
      >
        {sprintEstimateOptions.map((item) => (
          <CustomSelect.Option key={item.value} value={item.value}>
            {item.label}
          </CustomSelect.Option>
        ))}
      </CustomSelect>
    </div>
  ) : showDefault ? (
    <span className="capitalize">{sprintEstimateOptions.find((v) => v.value === value)?.label ?? value}</span>
  ) : null;
}
