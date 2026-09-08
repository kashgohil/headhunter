import Link from "next/link";
export default function MissingReview() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Review unavailable</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This review may have been removed or replaced by a restore.
      </p>
      <Link href="/reviews" className="mt-5 inline-block text-sm underline">
        Open weekly reviews
      </Link>
    </div>
  );
}
