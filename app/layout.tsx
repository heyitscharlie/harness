import type { Metadata } from "next";
import { ThemeProvider } from "@heyitscharlie/design-system";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_MODEL } from "@/lib/harness/agent/gemini";
import { AppSidebar } from "./components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Harness",
  description: "A reusable tool-calling agent, with evals that prove it behaves.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // ThemeProvider sets the .dark class and data-palette on <html> in the
    // browser, so the server-rendered markup differs slightly. That's expected.
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="bg-gradient-brand min-h-screen antialiased">
        <ThemeProvider defaultPalette="space" storageKey="harness-theme">
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar model={DEFAULT_MODEL} />
              {/* Transparent so the body's gradient shows through. */}
              <SidebarInset className="bg-transparent">
                {/* On mobile the sidebar is a drawer; this button opens it. */}
                <div className="px-4 pt-4 md:hidden">
                  <SidebarTrigger />
                </div>
                <div className="flex flex-1 flex-col px-4 pt-8 sm:px-8">
                  {children}
                  <footer className="py-4 text-center font-mono text-xs text-muted-foreground">
                    © 2026 Charlie Martins
                  </footer>
                </div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
