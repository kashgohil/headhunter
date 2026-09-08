import Link from "next/link";
import { connection } from "next/server";
import { sqlite } from "@/lib/db";
import { lastCompletedWeek } from "@/lib/weekly-review/model";
import { ActionForm } from "@/components/action-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createReviewAction } from "./actions";
export const metadata = { title: "Weekly reviews" };
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await connection();
  const query = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.page ?? "1") || 1),
  );
  const rows = sqlite
    .prepare(
      "SELECT id,week_start,json_extract(edits,'$.status') status,updated_at FROM weekly_reviews ORDER BY week_start DESC LIMIT 21 OFFSET ?",
    )
    .all((page - 1) * 20) as Array<{
    id: string;
    week_start: string;
    status: string;
    updated_at: number;
  }>;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
      <header className="border-b pb-7">
        <h1 className="text-3xl font-semibold tracking-tight">Weekly review</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Take ten minutes to understand what moved, what needs attention, and
          what deserves your time next week.
        </p>
      </header>
      <div className="mt-8 grid gap-8 md:grid-cols-[340px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Review a completed week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-5 text-sm leading-6 text-muted-foreground">
              Weeks run Monday through Sunday in UTC. Creating a review
              preserves its facts; reopening a week keeps the same snapshot and
              notes.
            </p>
            <ActionForm
              action={createReviewAction}
              label="Open weekly review"
              preserveInput
            >
              <div>
                <label
                  htmlFor="review-week"
                  className="mb-2 block text-sm font-medium"
                >
                  Week starting Monday
                </label>
                <DatePicker
                  id="review-week"
                  name="weekStart"
                  defaultValue={lastCompletedWeek()}
                />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
        <section aria-labelledby="review-history">
          <h2 id="review-history" className="text-lg font-semibold">
            Review history
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Saved facts stay fixed as your pipeline evolves. Reflections and
            plans remain editable.
          </p>
          {rows.length ? (
            <ul className="mt-5 divide-y border-y">
              {rows.slice(0, 20).map((row) => (
                <li key={row.id} className="py-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/reviews/${row.id}`}
                      className="font-medium hover:underline"
                    >
                      Week of {row.week_start}
                    </Link>
                    <Badge
                      variant={row.status === "reviewed" ? "signal" : "outline"}
                    >
                      {row.status === "reviewed" ? "Reviewed" : "Draft"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Saved{" "}
                    {new Date(row.updated_at)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 16)}{" "}
                    UTC
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed p-6 text-sm leading-6 text-muted-foreground">
              No reviews on this page. Start with the last completed week, even
              if you have only a few records.
            </p>
          )}
          <nav aria-label="Review history pages" className="mt-5 flex gap-3">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={`/reviews?page=${page - 1}`}>Previous</Link>
              </Button>
            ) : null}
            {rows.length > 20 ? (
              <Button asChild variant="outline">
                <Link href={`/reviews?page=${page + 1}`}>Next</Link>
              </Button>
            ) : null}
          </nav>
        </section>
      </div>
    </div>
  );
}
