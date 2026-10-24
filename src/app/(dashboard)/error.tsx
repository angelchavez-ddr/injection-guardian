"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-6">
      <h1 className="text-lg font-semibold">The console could not load this view</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message || "Unexpected error."}</p>
      <button type="button" className="mt-4 text-sm underline" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
