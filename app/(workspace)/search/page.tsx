import Link from "next/link";
import { connection } from "next/server";
import { sqlite } from "@/lib/db";
import { searchKinds, searchWorkspace } from "@/lib/search/query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/action-form";
export const metadata = { title: "Search" };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const kind =
    typeof params.kind === "string" &&
    searchKinds.includes(params.kind as (typeof searchKinds)[number])
      ? params.kind
      : "all";
  const { results, total, page } = searchWorkspace(
    sqlite,
    q,
    kind,
    Number(params.page ?? 1),
  );
  const pageHref = (next: number) =>
    `/search?${new URLSearchParams({ q, kind, page: String(next) })}`;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Search your workspace
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Find jobs, companies, contacts, documents, notes, and answers.
      </p>
      <form action="/search" className="mt-8 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="workspace-query" className="text-sm font-medium">
            Search terms
          </label>
          <Input
            key={q}
            id="workspace-query"
            name="q"
            defaultValue={q}
            maxLength={200}
            placeholder="Role, company, or a phrase you remember"
            className="mt-2"
          />
        </div>
        <FormSelect
          key={kind}
          name="kind"
          label="Search in"
          defaultValue={kind}
          options={[
            { value: "all", label: "Everything" },
            ...searchKinds.map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            })),
          ]}
        />
        <Button>Search</Button>
      </form>
      <p role="status" className="my-6 text-sm text-muted-foreground">
        {q.trim()
          ? `${total} ${total === 1 ? "result" : "results"}`
          : "Enter a search term to get started."}
      </p>
      <div className="divide-y border-y">
        {results.map((result) => (
          <article key={`${result.kind}:${result.id}`} className="py-5">
            <Link
              href={result.href}
              className="mt-1 block break-words font-medium underline-offset-4 hover:underline"
            >
              {result.title}
            </Link>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {result.kind}
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {result.content}
            </p>
          </article>
        ))}
      </div>
      {q.trim() && !results.length ? (
        <p className="py-8 text-sm text-muted-foreground">
          No matches on this page. Try fewer words, another category, or return
          to the first page.
        </p>
      ) : null}
      {total > 25 || page > 1 ? (
        <nav aria-label="Search pages" className="mt-6 flex items-center gap-4">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={pageHref(page - 1)}>Previous</Link>
            </Button>
          ) : null}
          <span className="text-sm">Page {page}</span>
          {page * 25 < total ? (
            <Button asChild variant="outline">
              <Link href={pageHref(page + 1)}>Next</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
