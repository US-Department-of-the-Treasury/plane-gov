import * as React from "react";

import { EpicBacklogIcon } from "./backlog";
import { EpicCancelledIcon } from "./cancelled";
import { EpicCompletedIcon } from "./completed";
import { EpicInProgressIcon } from "./in-progress";
import { EpicPausedIcon } from "./paused";
import { EpicPlannedIcon } from "./planned";

export type TEpicStatus = "backlog" | "planned" | "in-progress" | "paused" | "completed" | "cancelled";

type Props = {
  status: TEpicStatus;
  className?: string;
  height?: string;
  width?: string;
};

export function EpicStatusIcon({ status, className, height = "12px", width = "12px" }: Props) {
  if (status === "backlog") return <EpicBacklogIcon className={className} height={height} width={width} />;
  else if (status === "cancelled") return <EpicCancelledIcon className={className} height={height} width={width} />;
  else if (status === "completed") return <EpicCompletedIcon className={className} height={height} width={width} />;
  else if (status === "in-progress") return <EpicInProgressIcon className={className} height={height} width={width} />;
  else if (status === "paused") return <EpicPausedIcon className={className} height={height} width={width} />;
  else return <EpicPlannedIcon className={className} height={height} width={width} />;
}
