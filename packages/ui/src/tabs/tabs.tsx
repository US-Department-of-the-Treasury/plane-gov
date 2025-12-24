import React, { useEffect, useState } from "react";
import { Tabs as RadixTabs, TabsList, TabsTrigger, TabsContent } from "@plane/propel/primitives";
// helpers
import { useLocalStorage } from "@plane/hooks";
import { cn } from "../utils";
// types
import type { TabListItem } from "./tab-list";

export type TabContent = {
  content: React.ReactNode;
};

export type TabItem = TabListItem & TabContent;

type TTabsProps = {
  tabs: TabItem[];
  storageKey?: string;
  actions?: React.ReactNode;
  defaultTab?: string;
  containerClassName?: string;
  tabListContainerClassName?: string;
  tabListClassName?: string;
  tabClassName?: string;
  tabPanelClassName?: string;
  size?: "sm" | "md" | "lg";
  storeInLocalStorage?: boolean;
};

export function Tabs(props: TTabsProps) {
  const {
    tabs,
    storageKey,
    actions,
    defaultTab = tabs[0]?.key,
    containerClassName = "",
    tabListContainerClassName = "",
    tabListClassName = "",
    tabClassName = "",
    tabPanelClassName = "",
    size = "md",
    storeInLocalStorage = true,
  } = props;
  // local storage
  const { storedValue, setValue } = useLocalStorage(
    storeInLocalStorage && storageKey ? `tab-${storageKey}` : `tab-${tabs[0]?.key}`,
    defaultTab
  );
  // state
  const [selectedTab, setSelectedTab] = useState(storedValue ?? defaultTab);

  useEffect(() => {
    if (storeInLocalStorage) {
      setValue(selectedTab);
    }
  }, [selectedTab, setValue, storeInLocalStorage, storageKey]);

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    // Call the onClick handler if defined on the tab
    const tab = tabs.find((t) => t.key === value);
    if (tab?.onClick) {
      tab.onClick();
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <RadixTabs value={selectedTab} onValueChange={handleTabChange}>
        <div className={cn("flex flex-col w-full h-full gap-2", containerClassName)}>
          <div className={cn("flex w-full items-center gap-4", tabListContainerClassName)}>
            <TabsList
              className={cn(
                "flex w-full min-w-fit items-center justify-between gap-1.5 rounded-md text-13 p-0.5 bg-layer-1",
                tabListClassName
              )}
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  disabled={tab.disabled}
                  className={cn(
                    "flex items-center justify-center p-1 min-w-fit w-full font-medium text-primary outline-none focus:outline-none cursor-pointer transition-all rounded-sm",
                    "data-[state=active]:bg-layer-transparent-active data-[state=active]:text-primary data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-placeholder data-[state=inactive]:hover:text-tertiary data-[state=inactive]:hover:bg-layer-transparent-hover",
                    "disabled:text-placeholder disabled:cursor-not-allowed",
                    {
                      "text-11": size === "sm",
                      "text-13": size === "md",
                      "text-14": size === "lg",
                    },
                    tabClassName
                  )}
                >
                  {tab.icon && (
                    <tab.icon
                      className={cn({ "size-3": size === "sm", "size-4": size === "md", "size-5": size === "lg" })}
                    />
                  )}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {actions && <div className="flex-grow">{actions}</div>}
          </div>
          <div className="flex-1">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.key}
                value={tab.key}
                className={cn("relative outline-none mt-0", tabPanelClassName)}
              >
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </div>
      </RadixTabs>
    </div>
  );
}
