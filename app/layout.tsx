import type { Metadata } from "next";
import { ThemeProvider } from "@heyitscharlie/design-system";
import { DEFAULT_MODEL } from "@/lib/harness/agent/gemini";
import { SiteHeader } from "./components/site-header";
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
          <div className="flex min-h-dvh w-full flex-col gap-6 px-4 pt-8 sm:px-8">
            <SiteHeader model={DEFAULT_MODEL} />
            <main className="flex flex-1 flex-col">{children}</main>
            <footer className="py-4 text-center font-mono text-xs text-muted-foreground">
              © 2026 Charlie Martins
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
