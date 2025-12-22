import type { FC } from "react";

export type TAdditionalActivityRoot = {
  activityId: string;
  showIssue?: boolean;
  ends: "top" | "bottom" | undefined;
  field: string | undefined;
};

export function AdditionalActivityRoot(_props: TAdditionalActivityRoot) {
  return <></>;
}
