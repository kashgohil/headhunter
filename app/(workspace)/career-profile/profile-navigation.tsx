"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const items = [
  { href: "/career-profile", label: "Core evidence" },
  { href: "/career-profile/library", label: "Projects & credentials" },
  { href: "/career-profile/stories", label: "Stories & answers" },
];

export function ProfileNavigation() {
  const pathname = usePathname();
  const active = items.find((item) => item.href === pathname)?.href ?? items[0].href;

  return (
    <Tabs value={active} className="mb-8 w-fit">
      <TabsList aria-label="Career profile sections" className="overflow-x-auto">
        {items.map((item) => (
          <TabsTrigger key={item.href} value={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
