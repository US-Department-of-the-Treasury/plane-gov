import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
// assets
import LogoSpinnerDark from "@/app/assets/images/logo-spinner-dark.gif?url";
import LogoSpinnerLight from "@/app/assets/images/logo-spinner-light.gif?url";

export function LogoSpinner() {
  const { resolvedTheme } = useTheme();
  // Use mounted state to prevent hydration mismatch - always show light on first render
  // to match the static HTML in the build output
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // This is the standard pattern for hydration-safe theme switching.
    // Setting mounted=true triggers a re-render after hydration completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for hydration-safe theme switching
    setMounted(true);
  }, []);

  // Use light theme during SSR/hydration to match static HTML, then switch after mount
  const logoSrc = mounted && resolvedTheme === "dark" ? LogoSpinnerDark : LogoSpinnerLight;

  return (
    <div className="flex items-center justify-center">
      <img src={logoSrc} alt="logo" className="h-6 w-auto sm:h-11 object-contain" />
    </div>
  );
}
