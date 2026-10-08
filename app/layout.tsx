import type { Metadata } from "next";
import { ThemeProvider } from "@heyitscharlie/design-system";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eval Harness",
  description: "Run LLM test suites against Gemini and score the outputs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // ThemeProvider sets the .dark class and data-palette on <html> in the
    // browser, so the server-rendered markup differs slightly. That's expected.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
