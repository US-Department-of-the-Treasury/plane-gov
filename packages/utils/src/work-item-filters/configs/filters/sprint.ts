// plane imports
import type { ISprint, TSprintGroups, TFilterProperty, TSupportedOperators } from "@plane/types";
import { EQUALITY_OPERATOR, COLLECTION_OPERATOR } from "@plane/types";
// local imports
import type { TCreateFilterConfigParams, IFilterIconConfig, TCreateFilterConfig } from "../../../rich-filters";
import { createFilterConfig, getMultiSelectConfig, createOperatorConfigEntry } from "../../../rich-filters";

/**
 * Sprint filter specific params
 */
export type TCreateSprintFilterParams = TCreateFilterConfigParams &
  IFilterIconConfig<TSprintGroups> & {
    sprints: ISprint[];
  };

/**
 * Helper to get the sprint multi select config
 * @param params - The filter params
 * @returns The sprint multi select config
 */
export const getSprintMultiSelectConfig = (params: TCreateSprintFilterParams, singleValueOperator: TSupportedOperators) =>
  getMultiSelectConfig<ISprint, string, TSprintGroups>(
    {
      items: params.sprints,
      getId: (sprint) => sprint.id,
      getLabel: (sprint) => sprint.name,
      getValue: (sprint) => sprint.id,
      getIconData: (sprint) => sprint.status || "draft",
    },
    {
      singleValueOperator,
      ...params,
    },
    {
      ...params,
    }
  );

/**
 * Get the sprint filter config
 * @template K - The filter key
 * @param key - The filter key to use
 * @returns A function that takes parameters and returns the sprint filter config
 */
export const getSprintFilterConfig =
  <P extends TFilterProperty>(key: P): TCreateFilterConfig<P, TCreateSprintFilterParams> =>
  (params: TCreateSprintFilterParams) =>
    createFilterConfig<P, string>({
      id: key,
      label: "Sprint",
      ...params,
      icon: params.filterIcon,
      supportedOperatorConfigsMap: new Map([
        createOperatorConfigEntry(COLLECTION_OPERATOR.IN, params, (updatedParams) =>
          getSprintMultiSelectConfig(updatedParams, EQUALITY_OPERATOR.EXACT)
        ),
      ]),
    });
