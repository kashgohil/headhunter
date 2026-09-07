import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { commandCenterAlerts, searchStrategyVersions } from "@/lib/db/schema";
import { getPipelineOverview } from "@/lib/applications/pipeline";
import { buildOverview, partitionAlerts } from "@/lib/command-center/overview";

export async function getCommandCenter() {
  const pipeline = await getPipelineOverview();
  const now = new Date();
  const overview = buildOverview(pipeline, now);
  const [preferences, strategy] = await Promise.all([
    db.select().from(commandCenterAlerts),
    db
      .select({ weeklyHours: searchStrategyVersions.weeklyHours })
      .from(searchStrategyVersions)
      .orderBy(desc(searchStrategyVersions.version))
      .get(),
  ]);
  if (!strategy)
    overview.alerts.push({
      key: "setup:strategy",
      kind: "setup",
      title: "Set your search direction",
      source: "Search strategy",
      href: "/settings/search-strategy",
      reason:
        "Choose target roles and a weekly time budget to guide your search.",
      dueAt: null,
      rank: 0,
    });
  if (!overview.total)
    overview.alerts.push({
      key: "setup:capture",
      kind: "setup",
      title: "Capture your first role",
      source: "Job inbox",
      href: "/jobs/new",
      reason:
        "Save a job to start a plan, evaluate fit, and track your application.",
      dueAt: null,
      rank: 0,
    });
  return {
    ...overview,
    ...partitionAlerts(overview.alerts, preferences, now),
    weeklyHours: strategy?.weeklyHours ?? null,
    now,
  };
}

export async function updateAlertPreference(
  key: string,
  operation: "dismiss" | "snooze" | "restore",
) {
  const overview = await getCommandCenter();
  if (!overview.alerts.some((alert) => alert.key === key))
    throw new Error(
      "This alert has changed or been resolved. Refresh the command center.",
    );
  if (operation === "restore") {
    await db
      .delete(commandCenterAlerts)
      .where(eq(commandCenterAlerts.key, key));
    return;
  }
  const values = {
    key,
    dismissed: operation === "dismiss",
    snoozedUntil:
      operation === "snooze" ? new Date(Date.now() + 86_400_000) : null,
    updatedAt: new Date(),
  };
  await db
    .insert(commandCenterAlerts)
    .values(values)
    .onConflictDoUpdate({ target: commandCenterAlerts.key, set: values });
}
