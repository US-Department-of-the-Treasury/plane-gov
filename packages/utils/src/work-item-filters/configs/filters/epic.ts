// plane imports
import type { IEpic, TFilterProperty } from "@plane/types";
import { EQUALITY_OPERATOR, COLLECTION_OPERATOR } from "@plane/types";
// local imports
import type { TCreateFilterConfigParams, IFilterIconConfig, TCreateFilterConfig } from "../../../rich-filters";
import { createFilterConfig, getMultiSelectConfig, createOperatorConfigEntry } from "../../../rich-filters";

/**
 * Epic filter specific params
 */
export type TCreateEpicFilterParams = TCreateFilterConfigParams &
  IFilterIconConfig<undefined> & {
    epics: IEpic[];
  };

/**
 * Helper to get the epic multi select config
 * @param params - The filter params
 * @returns The epic multi select config
 */
export const getEpicMultiSelectConfig = (params: TCreateEpicFilterParams) =>
  getMultiSelectConfig<IEpic, string, undefined>(
    {
      items: params.epics,
      getId: (epic) => epic.id,
      getLabel: (epic) => epic.name,
      getValue: (epic) => epic.id,
      getIconData: () => undefined,
    },
    {
      singleValueOperator: EQUALITY_OPERATOR.EXACT,
      ...params,
    },
    {
      ...params,
    }
  );

/**
 * Get the epic filter config
 * @template K - The filter key
 * @param key - The filter key to use
 * @returns A function that takes parameters and returns the epic filter config
 */
export const getEpicFilterConfig =
  <P extends TFilterProperty>(key: P): TCreateFilterConfig<P, TCreateEpicFilterParams> =>
  (params: TCreateEpicFilterParams) =>
    createFilterConfig<P, string>({
      id: key,
      label: "Epic",
      ...params,
      icon: params.filterIcon,
      supportedOperatorConfigsMap: new Map([
        createOperatorConfigEntry(COLLECTION_OPERATOR.IN, params, (updatedParams) =>
          getEpicMultiSelectConfig(updatedParams)
        ),
      ]),
    });
