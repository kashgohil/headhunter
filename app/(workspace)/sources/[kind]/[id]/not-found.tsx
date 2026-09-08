import Link from "next/link";
export default function MissingSource() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Source unavailable</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        This source may have been removed or replaced by a restore. Its absence
        does not verify the generated claim. Review the content before using it.
      </p>
      <Link href="/search" className="mt-6 inline-block text-sm underline">
        Search your workspace
      </Link>
    </div>
  );
}
