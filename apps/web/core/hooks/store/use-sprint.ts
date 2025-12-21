import { useContext } from "react";
// mobx store
import { StoreContext } from "@/lib/store-context";
// types
import type { ISprintStore } from "@/plane-web/store/sprint";

export const useSprint = (): ISprintStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useSprint must be used within StoreProvider");
  return context.sprint;
};
