import { ThemeProvider } from "next-themes";
import { AppProgressBar } from "@/lib/b-progress";
import { QueryProvider } from "@/store/queries";
import { InstanceProvider } from "./(all)/instance.provider";
import { ToastWithTheme } from "./(all)/toast";
import { UserProvider } from "./(all)/user.provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider themes={["light", "dark"]} defaultTheme="system" enableSystem>
      <AppProgressBar />
      <ToastWithTheme />
      <QueryProvider>
        <InstanceProvider>
          <UserProvider>{children}</UserProvider>
        </InstanceProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
