"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/career-profile", label: "Core evidence" },
  { href: "/career-profile/library", label: "Projects & credentials" },
  { href: "/career-profile/stories", label: "Stories & answers" },
];

export function ProfileNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Career profile sections" className="mb-8 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 shadow-[0_1px_2px_rgba(28,25,20,0.04)]">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3.5 py-2 text-sm font-medium outline-none transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:ring-[3px] focus-visible:ring-ring/30 motion-reduce:transition-none",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
