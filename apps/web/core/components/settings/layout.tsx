import { useRef } from "react";
export function SettingsContentLayout({ children }: { children: React.ReactNode }) {
  // refs
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full h-full min-h-full overflow-y-scroll " ref={ref}>
      {children}
    </div>
  );
}
