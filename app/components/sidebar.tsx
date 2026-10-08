"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, SquarePen } from "lucide-react";
import { ModeToggle, Typography } from "@heyitscharlie/design-system";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { RecentConversations } from "./recent-conversations";

const LINKS = [
  { href: "/", label: "New chat", icon: SquarePen },
  { href: "/evals", label: "Evals", icon: FlaskConical },
];

export function AppSidebar({ model }: { model: string }) {
  return (
    <Sidebar>
      <SidebarHeader className="gap-1 p-4">
        <Typography variant="h3">Agent Harness</Typography>
        <Typography variant="label">model: {model}</Typography>
      </SidebarHeader>
      <SidebarContent>
        {/* Reads the URL, which dynamic routes like /c/[id] only know at request time. */}
        <Suspense fallback={null}>
          <SidebarNav />
        </Suspense>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <ModeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarNav() {
  const pathname = usePathname();
  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu className="gap-2">
            {LINKS.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === link.href}
                  className="data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium"
                >
                  <Link href={link.href}>
                    <link.icon />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Recent</SidebarGroupLabel>
        <SidebarGroupContent>
          <RecentConversations />
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
