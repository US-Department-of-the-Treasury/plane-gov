import type { LucideProps } from "lucide-react";
import type { FC } from "react";
import React from "react";
import { Tabs as RadixTabs, TabsList as RadixTabsList, TabsTrigger } from "@plane/propel/primitives";
// helpers
import { cn } from "../utils";

export type TabListItem = {
  key: string;
  icon?: FC<LucideProps>;
  label?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

type TTabListProps = {
  tabs: TabListItem[];
  tabListClassName?: string;
  tabClassName?: string;
  size?: "sm" | "md" | "lg";
  selectedTab?: string;
  autoWrap?: boolean;
  onTabChange?: (key: string) => void;
};

export function TabList({ autoWrap = true, ...props }: TTabListProps) {
  const { tabs, selectedTab, onTabChange } = props;

  return autoWrap ? (
    <RadixTabs value={selectedTab} onValueChange={onTabChange} defaultValue={tabs[0]?.key}>
      <TabListInner {...props} />
    </RadixTabs>
  ) : (
    <TabListInner {...props} />
  );
}

function TabListInner({ tabs, tabListClassName, tabClassName, size = "md", onTabChange }: TTabListProps) {
  return (
    <RadixTabsList
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
          onClick={() => {
            if (!tab.disabled) {
              onTabChange?.(tab.key);
              tab.onClick?.();
            }
          }}
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
            <tab.icon className={cn({ "size-3": size === "sm", "size-4": size === "md", "size-5": size === "lg" })} />
          )}
          {tab.label}
        </TabsTrigger>
      ))}
    </RadixTabsList>
  );
}
