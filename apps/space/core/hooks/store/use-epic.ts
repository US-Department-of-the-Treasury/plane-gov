import { useContext } from "react";
// lib
import { StoreContext } from "@/lib/store-provider";
// store
import type { IIssueEpicStore } from "@/store/epic.store";

export const useEpic = (): IIssueEpicStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useEpic must be used within StoreProvider");
  return context.module;
};
