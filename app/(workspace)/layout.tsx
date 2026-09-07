import Link from "next/link";
import { Archive, BriefcaseBusiness, FileText, Search, Settings, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const secondaryItems = [
  { label: "Career profile", icon: UserRound },
  { label: "Resume studio", icon: FileText },
  { label: "Search strategy", icon: Search },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center justify-between px-5 lg:h-20">
          <Link href="/jobs" className="flex items-center gap-3" aria-label="Headhunter job inbox">
            <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"><span className="text-sm font-bold tracking-[-0.08em]">HH</span></span>
            <span className="text-sm font-semibold tracking-tight">Headhunter</span>
          </Link>
          <Badge variant="signal" className="lg:hidden">Local</Badge>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3 lg:pb-0" aria-label="Primary navigation">
          <Link href="/jobs" className="flex h-10 shrink-0 items-center gap-3 rounded-md bg-sidebar-accent px-3 text-sm font-medium text-sidebar-accent-foreground"><BriefcaseBusiness className="size-4" />Job inbox</Link>
          <span className="mt-5 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45 lg:block">Build next</span>
          {secondaryItems.map((item) => (
            <span key={item.label} className="flex h-10 shrink-0 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/45" aria-disabled="true"><item.icon className="size-4" />{item.label}</span>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 hidden border-t border-sidebar-border p-3 lg:block">
          <div className="mb-2 flex items-center justify-between rounded-md px-3 py-2 text-xs text-sidebar-foreground/55">
            <span className="flex items-center gap-2"><Archive className="size-3.5" /> Local workspace</span>
            <span className="size-1.5 rounded-full bg-signal" aria-label="Available" />
          </div>
          <span className="flex h-9 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/45" aria-disabled="true"><Settings className="size-4" /> Settings</span>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
