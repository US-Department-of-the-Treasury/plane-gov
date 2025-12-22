import type { ReactNode } from "react";
// plane imports
import { Row } from "@plane/ui";
// components
import { cn } from "@plane/utils";
import { ExtendedAppHeader } from "@/plane-web/components/common/extended-app-header";

export interface AppHeaderProps {
  header: ReactNode;
  mobileHeader?: ReactNode;
  className?: string;
  rowClassName?: string;
}

export function AppHeader(props: AppHeaderProps) {
  const { header, mobileHeader, className, rowClassName } = props;

  return (
    <div className={cn("z-[18]", className)}>
      <Row className={cn("h-11 flex gap-2 w-full items-center border-b border-subtle bg-surface-1", rowClassName)}>
        <ExtendedAppHeader header={header} />
      </Row>
      {mobileHeader && mobileHeader}
    </div>
  );
}
