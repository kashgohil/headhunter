import { cookies } from "next/headers";
import { connection } from "next/server";

import { WorkspaceSidebar } from "@/app/_components/workspace-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { accessMode } from "@/lib/auth/config";
import { requireOwner } from "@/lib/auth/server";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await connection();
  await requireOwner();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <WorkspaceSidebar hosted={accessMode() === "hosted"} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-sm md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold tracking-tight">Headhunter</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
