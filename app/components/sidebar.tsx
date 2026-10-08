"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, MessageSquare } from "lucide-react";
import { ModeToggle, Typography } from "@heyitscharlie/design-system";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const LINKS = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/evals", label: "Evals", icon: FlaskConical },
];

export function AppSidebar({ model }: { model: string }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="gap-1 p-4">
        <Typography variant="h3">Agent Harness</Typography>
        <Typography variant="label" className="text-sidebar-foreground/70">
          model: {model}
        </Typography>
      </SidebarHeader>
      <SidebarContent>
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
      </SidebarContent>
      <SidebarFooter className="p-4">
        <ModeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
