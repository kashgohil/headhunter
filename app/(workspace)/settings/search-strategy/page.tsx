import type { Metadata } from "next";

import { SearchStrategyForm } from "@/app/(workspace)/settings/search-strategy/search-strategy-form";
import { getCurrentSearchStrategy } from "@/lib/search-strategy/repository";

export const metadata: Metadata = { title: "Search strategy · Headhunter" };

export default async function SearchStrategyPage() {
  const strategy = await getCurrentSearchStrategy();

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <header className="mb-8 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          {strategy ? "Search strategy" : "Set your search direction"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Define what makes an opportunity viable and worthwhile. These inputs will explain—not hide—future fit recommendations.
        </p>
      </header>

      <SearchStrategyForm strategy={strategy} />
    </div>
  );
}
