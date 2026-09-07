import "server-only";

import { desc } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { auditEvents, searchStrategyVersions } from "@/lib/db/schema";
import type { SearchStrategyInput } from "@/lib/search-strategy/validation";

export type SearchStrategy = SearchStrategyInput & {
  id: string;
  version: number;
  createdAt: Date;
};

export async function getCurrentSearchStrategy(): Promise<SearchStrategy | null> {
  await connection();

  const [strategy] = await db
    .select()
    .from(searchStrategyVersions)
    .orderBy(desc(searchStrategyVersions.version))
    .limit(1);

  return strategy ?? null;
}

export async function saveSearchStrategy(input: SearchStrategyInput): Promise<SearchStrategy> {
  const id = crypto.randomUUID();
  const createdAt = new Date();

  return db.transaction((tx) => {
    const [latest] = tx
      .select({ version: searchStrategyVersions.version })
      .from(searchStrategyVersions)
      .orderBy(desc(searchStrategyVersions.version))
      .limit(1)
      .all();
    const version = (latest?.version ?? 0) + 1;

    tx.insert(searchStrategyVersions).values({ id, version, ...input, createdAt }).run();
    tx.insert(auditEvents).values({
      id: crypto.randomUUID(),
      action: "search_strategy.saved",
      entityType: "search_strategy",
      entityId: id,
      occurredAt: createdAt,
    }).run();

    return { id, version, ...input, createdAt };
  });
}
