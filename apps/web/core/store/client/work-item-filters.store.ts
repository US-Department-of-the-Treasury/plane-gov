import { create } from "zustand";
// plane imports
import type { TExpressionOptions } from "@plane/constants";
import type { EIssuesStoreType, TWorkItemFilterExpression, TWorkItemFilterProperty } from "@plane/types";
import { LOGICAL_OPERATOR } from "@plane/types";
import { getOperatorForPayload } from "@plane/utils";
// shared-state imports
import { FilterInstance } from "@plane/shared-state";
import { buildWorkItemFilterExpressionFromConditions } from "@plane/shared-state";
import { workItemFiltersAdapter } from "@plane/shared-state";
import type { IWorkItemFilterInstance, TWorkItemFilterKey } from "@plane/shared-state";
import type { TWorkItemFilterCondition } from "@plane/shared-state";

type TGetOrCreateFilterParams = {
  showOnMount?: boolean;
  entityId: string;
  entityType: EIssuesStoreType;
  expressionOptions?: TExpressionOptions<TWorkItemFilterExpression>;
  initialExpression?: TWorkItemFilterExpression;
  onExpressionChange?: (expression: TWorkItemFilterExpression) => void;
};

interface WorkItemFiltersState {
  filters: Map<TWorkItemFilterKey, IWorkItemFilterInstance>;
}

interface WorkItemFiltersActions {
  getFilter: (entityType: EIssuesStoreType, entityId: string) => IWorkItemFilterInstance | undefined;
  getOrCreateFilter: (params: TGetOrCreateFilterParams) => IWorkItemFilterInstance;
  resetExpression: (entityType: EIssuesStoreType, entityId: string, expression: TWorkItemFilterExpression) => void;
  updateFilterExpressionFromConditions: (
    entityType: EIssuesStoreType,
    entityId: string,
    conditions: TWorkItemFilterCondition[],
    fallbackFn: (expression: TWorkItemFilterExpression) => Promise<void>
  ) => Promise<void>;
  updateFilterValueFromSidebar: (
    entityType: EIssuesStoreType,
    entityId: string,
    condition: TWorkItemFilterCondition
  ) => void;
  deleteFilter: (entityType: EIssuesStoreType, entityId: string) => void;
}

export type WorkItemFiltersStore = WorkItemFiltersState & WorkItemFiltersActions;

const getFilterKey = (entityType: EIssuesStoreType, entityId: string): TWorkItemFilterKey =>
  `${entityType}-${entityId}`;

const initializeFilterInstance = (params: TGetOrCreateFilterParams): IWorkItemFilterInstance =>
  new FilterInstance<TWorkItemFilterProperty, TWorkItemFilterExpression>({
    adapter: workItemFiltersAdapter,
    initialExpression: params.initialExpression,
    onExpressionChange: params.onExpressionChange,
    options: {
      expression: params.expressionOptions,
      visibility: params.showOnMount
        ? { autoSetVisibility: false, isVisibleOnMount: true }
        : { autoSetVisibility: true },
    },
  });

export const useWorkItemFiltersStore = create<WorkItemFiltersStore>()((set, get) => ({
  filters: new Map<TWorkItemFilterKey, IWorkItemFilterInstance>(),

  getFilter: (entityType, entityId) => {
    const filterKey = getFilterKey(entityType, entityId);
    return get().filters.get(filterKey);
  },

  getOrCreateFilter: (params) => {
    const existingFilter = get().getFilter(params.entityType, params.entityId);

    if (existingFilter) {
      // Update expression options on existing filter to ensure they're current
      if (params.expressionOptions) {
        existingFilter.updateExpressionOptions(params.expressionOptions);
      }
      // Update callback if provided
      if (params.onExpressionChange) {
        existingFilter.onExpressionChange = params.onExpressionChange;
      }
      // Update visibility if provided
      if (params.showOnMount !== undefined) {
        existingFilter.toggleVisibility(params.showOnMount);
      }
      return existingFilter;
    }

    // Create new filter instance
    const newFilter = initializeFilterInstance(params);
    const filterKey = getFilterKey(params.entityType, params.entityId);

    set((state) => {
      const newFilters = new Map(state.filters);
      newFilters.set(filterKey, newFilter);
      return { filters: newFilters };
    });

    return newFilter;
  },

  resetExpression: (entityType, entityId, expression) => {
    const filter = get().getFilter(entityType, entityId);
    if (filter) {
      filter.resetExpression(expression);
    }
  },

  updateFilterExpressionFromConditions: async (entityType, entityId, conditions, fallbackFn) => {
    const filter = get().getFilter(entityType, entityId);
    const newFilterExpression = buildWorkItemFilterExpressionFromConditions({
      conditions,
    });
    if (!newFilterExpression) return;

    // Update the filter expression using the filter instance if it exists, otherwise use the fallback function
    if (filter) {
      filter.resetExpression(newFilterExpression, false);
    } else {
      await fallbackFn(newFilterExpression);
    }
  },

  updateFilterValueFromSidebar: (entityType, entityId, condition) => {
    // Retrieve the filter instance for the specified entity
    const filter = get().getFilter(entityType, entityId);

    // Early return if filter instance doesn't exist
    if (!filter) {
      console.warn(
        `Cannot handle sidebar filters update: filter instance not found for entity type "${entityType}" with ID "${entityId}"`
      );
      return;
    }

    // Check for existing conditions with the same property and operator
    const conditionNode = filter.findFirstConditionByPropertyAndOperator(condition.property, condition.operator);

    // No existing condition found - add new condition with AND logic
    if (!conditionNode) {
      const { operator, isNegation } = getOperatorForPayload(condition.operator);

      // Create the condition payload with normalized operator
      const conditionPayload = {
        property: condition.property,
        operator,
        value: condition.value,
      };

      filter.addCondition(LOGICAL_OPERATOR.AND, conditionPayload, isNegation);
      return;
    }

    // Update existing condition (assuming single condition per property-operator pair)
    filter.updateConditionValue(conditionNode.id, condition.value);
  },

  deleteFilter: (entityType, entityId) => {
    const filterKey = getFilterKey(entityType, entityId);
    set((state) => {
      const newFilters = new Map(state.filters);
      newFilters.delete(filterKey);
      return { filters: newFilters };
    });
  },
}));
