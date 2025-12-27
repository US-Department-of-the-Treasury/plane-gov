"use client";

import { memo, useCallback, useMemo } from "react";
import { Hash, Type, Calendar, Link2, User, List, CheckSquare, Mail, Phone, Globe } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
// components
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import { PageTypeSelector } from "./page-type-selector";
import { PropertyValueEditor } from "./property-value-editor";
// hooks
import {
  usePropertyDefinitions,
  usePageProperties,
  useCreatePageProperty,
  useUpdatePageProperty,
  useUpdateWikiPage,
} from "@/store/queries";
// types
import type { TPropertyDefinition, TPropertyType, TPagePropertyValue, TWikiPageDetail, TPageType } from "@plane/types";

// Icon mapping for property types
const PROPERTY_TYPE_ICONS: Record<TPropertyType, React.FC<{ className?: string }>> = {
  text: Type,
  number: Hash,
  select: List,
  multi_select: List,
  date: Calendar,
  datetime: Calendar,
  checkbox: CheckSquare,
  url: Globe,
  email: Mail,
  phone: Phone,
  relation: Link2,
  user: User,
  multi_user: User,
};

interface PagePropertiesPanelProps {
  workspaceSlug: string;
  pageId: string;
  page: TWikiPageDetail;
  isEditable?: boolean;
}

export const PagePropertiesPanel = memo(function PagePropertiesPanel({
  workspaceSlug,
  pageId,
  page,
  isEditable = true,
}: PagePropertiesPanelProps) {
  const { t } = useTranslation();

  // Queries
  const { data: propertyDefinitions, isLoading: definitionsLoading } = usePropertyDefinitions(workspaceSlug);
  const { data: pageProperties, isLoading: propertiesLoading } = usePageProperties(workspaceSlug, pageId);

  // Mutations
  const updatePageMutation = useUpdateWikiPage();
  const createPropertyMutation = useCreatePageProperty();
  const updatePropertyMutation = useUpdatePageProperty();

  // Filter property definitions based on page type
  const filteredDefinitions = useMemo(() => {
    if (!propertyDefinitions) return [];
    const pageType = page.page_type || "page";
    return propertyDefinitions.filter((def) => def.page_types.length === 0 || def.page_types.includes(pageType));
  }, [propertyDefinitions, page.page_type]);

  // Create a map of property definition id -> property value
  const propertyValueMap = useMemo(() => {
    const map = new Map<string, TPagePropertyValue>();
    if (pageProperties) {
      pageProperties.forEach((pv) => {
        map.set(pv.property_definition, pv);
      });
    }
    return map;
  }, [pageProperties]);

  // Handle page type change
  const handlePageTypeChange = useCallback(
    async (newType: TPageType) => {
      try {
        await updatePageMutation.mutateAsync({
          workspaceSlug,
          pageId,
          data: { page_type: newType },
        });
      } catch (error) {
        console.error("Failed to update page type:", error);
      }
    },
    [workspaceSlug, pageId, updatePageMutation]
  );

  // Handle property value change
  const handlePropertyChange = useCallback(
    async (definition: TPropertyDefinition, newValue: unknown) => {
      const existingValue = propertyValueMap.get(definition.id);

      try {
        if (existingValue) {
          // Update existing property value
          await updatePropertyMutation.mutateAsync({
            workspaceSlug,
            pageId,
            propertyValueId: existingValue.id,
            data: { value: newValue },
          });
        } else {
          // Create new property value
          await createPropertyMutation.mutateAsync({
            workspaceSlug,
            pageId,
            data: {
              property_definition: definition.id,
              value: newValue,
            },
          });
        }
      } catch (error) {
        console.error("Failed to update property:", error);
      }
    },
    [workspaceSlug, pageId, propertyValueMap, updatePropertyMutation, createPropertyMutation]
  );

  const isLoading = definitionsLoading || propertiesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-24 bg-custom-background-80 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-7 w-28 bg-custom-background-80 rounded animate-pulse" />
              <div className="h-7 flex-1 bg-custom-background-80 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="h-full w-full overflow-y-auto px-6">
        <h5 className="mt-5 text-body-xs-medium">{t("common.properties") || "Properties"}</h5>
        <div className={cn("mb-2 mt-4 space-y-2.5", { "opacity-60": !isEditable })}>
          {/* Page Type Selector */}
          <SidebarPropertyListItem icon={Type} label="Type">
            <PageTypeSelector
              value={(page.page_type as TPageType) || "page"}
              onChange={(type) => void handlePageTypeChange(type)}
              disabled={!isEditable}
              className="w-full"
            />
          </SidebarPropertyListItem>

          {/* Dynamic Properties */}
          {filteredDefinitions.map((definition) => {
            const Icon = PROPERTY_TYPE_ICONS[definition.property_type] || Type;
            const propertyValue = propertyValueMap.get(definition.id);
            const value = propertyValue?.value ?? definition.default_value ?? null;

            return (
              <SidebarPropertyListItem key={definition.id} icon={Icon} label={definition.name}>
                <PropertyValueEditor
                  definition={definition}
                  value={value}
                  onChange={(newValue) => void handlePropertyChange(definition, newValue)}
                  disabled={!isEditable}
                />
              </SidebarPropertyListItem>
            );
          })}

          {/* Empty state for no properties */}
          {filteredDefinitions.length === 0 && (
            <div className="py-4 text-center text-sm text-custom-text-400">
              No properties available for this page type.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
