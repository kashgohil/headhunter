import Link from "next/link";
import { connection } from "next/server";
import { sqlite } from "@/lib/db";
import { listImports } from "@/lib/resume-import/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/lib/date";
import { UploadForm } from "./upload-form";
export const metadata = { title: "Import resume · Headhunter" };
export default async function ImportPage() {
  await connection();
  const imports = listImports(sqlite);
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <Button asChild variant="ghost" className="mb-5 -ml-3">
        <Link href="/career-profile">← Career profile</Link>
      </Button>
      <header className="mb-8 border-b pb-7">
        <h1 className="text-3xl font-semibold tracking-tight">
          Import your resume
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Bring your experience into one reviewable evidence bank. Start with a
          document, then check each fact before it becomes part of your profile.
        </p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Add a resume</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>
        <section aria-labelledby="imports-heading">
          <h2 id="imports-heading" className="mb-4 text-lg font-semibold">
            Your imports
          </h2>
          {imports.length ? (
            <div className="divide-y rounded-lg border bg-card">
              {imports.map((item) => (
                <Link
                  key={item.id}
                  href={`/career-profile/import/${item.id}`}
                  className="block p-5 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-medium">
                      {item.name}
                    </h3>
                    <Badge variant="outline">
                      {item.pending
                        ? "In review"
                        : item.total
                          ? "Reviewed"
                          : "No facts found"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {item.pending} awaiting review · {item.total} proposals ·{" "}
                    {formatDisplayDate(item.created_at)}
                  </p>
                  {item.warning ? (
                    <p className="mt-2 text-xs text-destructive">
                      Source needs attention
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6">
              <p className="text-sm font-medium">No imported resumes yet</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Upload a file or paste text to start. You can leave a review
                unfinished and return here later.
              </p>
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Re-importing the same source reopens its existing review. Existing
            career records are never replaced.
          </p>
        </section>
      </div>
    </div>
  );
}
