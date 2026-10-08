"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle, Typography, buttonVariants, cn } from "@heyitscharlie/design-system";

const LINKS = [
  { href: "/", label: "Chat" },
  { href: "/evals", label: "Evals" },
];

export function SiteHeader({ model }: { model: string }) {
  const pathname = usePathname();

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Typography variant="h1">Agent Harness</Typography>
          <Typography variant="label">model: {model}</Typography>
        </div>
        <ModeToggle />
      </div>
      <nav className="flex gap-1 border-b pb-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
            className={cn(buttonVariants({ variant: pathname === link.href ? "secondary" : "ghost" }))}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
