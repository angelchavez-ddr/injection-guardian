import type { DashboardSummary } from "@/lib/security/types";
import { SEVERITIES } from "@/lib/security/types";
import { severityLabel } from "@/lib/format";

export function StatCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">Analyzed items</p>
        <p className="mt-1 font-mono text-2xl">{summary.total}</p>
        <p className="mt-1 text-xs text-muted-foreground">{summary.simulatedCount} simulated</p>
      </article>
      <article className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">Awaiting review</p>
        <p className="mt-1 font-mono text-2xl">{summary.awaitingReview}</p>
        <p className="mt-1 text-xs text-muted-foreground">Human approval still required</p>
      </article>
      <article className="rounded-lg border border-border bg-card px-4 py-3 sm:col-span-2">
        <p className="text-xs text-muted-foreground">Findings by severity</p>
        <dl className="mt-2 grid grid-cols-5 gap-2">
          {SEVERITIES.map((severity) => (
            <div key={severity}>
              <dt className="text-[11px] text-muted-foreground">{severityLabel(severity)}</dt>
              <dd className="font-mono text-lg">{summary.bySeverity[severity]}</dd>
            </div>
          ))}
        </dl>
      </article>
    </div>
  );
}
