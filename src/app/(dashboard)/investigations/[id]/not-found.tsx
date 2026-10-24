import Link from "next/link";

export default function InvestigationNotFound() {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-6">
      <h1 className="text-lg font-semibold">Finding not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That investigation is not in the local audit log.</p>
      <Link href="/investigations" className="mt-4 inline-block text-sm underline">
        Back to investigations
      </Link>
    </div>
  );
}
