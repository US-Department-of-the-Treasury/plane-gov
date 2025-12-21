import { useContext } from "react";
// mobx store
import { StoreContext } from "@/lib/store-context";
// types
import type { IEpicFilterStore } from "@/store/module_filter.store";

export const useEpicFilter = (): IEpicFilterStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useEpicFilter must be used within StoreProvider");
  return context.epicFilter;
};
