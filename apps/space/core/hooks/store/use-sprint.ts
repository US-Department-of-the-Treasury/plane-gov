import { useContext } from "react";
// lib
import { StoreContext } from "@/lib/store-provider";
// store
import type { ISprintStore } from "@/store/sprint.store";

export const useSprint = (): ISprintStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useSprint must be used within StoreProvider");
  return context.sprint;
};
