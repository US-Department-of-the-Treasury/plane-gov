import { useContext } from "react";
// mobx store
import { StoreContext } from "@/lib/store-context";
// types
import type { ISprintFilterStore } from "@/store/sprint_filter.store";

export const useSprintFilter = (): ISprintFilterStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useSprintFilter must be used within StoreProvider");
  return context.sprintFilter;
};
