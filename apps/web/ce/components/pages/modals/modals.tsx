import type React from "react";
// components
import type { EPageStoreType } from "@/plane-web/hooks/store";
// store
import type { TPageInstance } from "@/store/pages/base-page";

export type TPageModalsProps = {
  page: TPageInstance;
  storeType: EPageStoreType;
};

export function PageModals(props: TPageModalsProps) {
  return null;
}
