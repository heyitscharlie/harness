"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ConversationSummary } from "@/lib/history";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

/** Recent conversations. Refetched on navigation, so a new chat appears once it's saved. */
export function RecentConversations() {
  const pathname = usePathname();
  const [items, setItems] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    let cancelled = false; // ignore a slow response if we've navigated again since
    fetch("/api/conversations?limit=15")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setItems(data);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!items.length) return null;
  return (
    <SidebarMenu className="gap-1">
      {items.map((c) => (
        <SidebarMenuItem key={c.id}>
          <SidebarMenuButton asChild size="sm" isActive={pathname === `/c/${c.id}`}>
            <Link href={`/c/${c.id}`} title={c.title}>
              <span>{c.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
