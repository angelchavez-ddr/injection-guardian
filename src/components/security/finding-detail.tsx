import Link from "next/link";
import { SeverityBadge } from "@/components/ui/badge";
import { formatTimestamp, humanizeToken, statusLabel } from "@/lib/format";
import { CONFIDENCE_MEANING, type FindingView } from "@/lib/security/types";

export function FindingDetail({ finding }: { finding: FindingView }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/investigations" className="hover:underline">
              Investigations
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{finding.subject || "Untitled finding"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {finding.source} · {formatTimestamp(finding.createdAt)} UTC · {statusLabel(finding.status)}
            {finding.simulated ? " · simulated" : ""}
          </p>
        </div>
        <SeverityBadge severity={finding.severity} />
      </div>

      {finding.simulated ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Simulated mailbox sample. These figures are produced by the local pipeline, not from a production tenant.
        </p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="Risk score" value={String(finding.riskScore)} />
        <Metric label="Signal coverage" value={finding.confidence.toFixed(2)} />
        <Metric label="Policy" value={humanizeToken(finding.policyDecision)} />
      </section>
      <p className="text-xs text-muted-foreground">{CONFIDENCE_MEANING}</p>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-sm font-semibold">Assessment</h2>
        <p className="mt-2 text-sm leading-6">{finding.summary}</p>
        {finding.excerpt ? (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 font-mono text-xs leading-5">{finding.excerpt}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-sm font-semibold">Deterministic indicators</h2>
        {finding.indicators.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No configured indicators matched.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {finding.indicators.map((indicator) => (
              <li key={indicator.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm font-medium">
                  {indicator.name} <span className="font-mono text-xs text-muted-foreground">weight {indicator.weight}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{indicator.evidence}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-sm font-semibold">Defensive recommendations</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {finding.recommendedActions.map((action) => (
            <li key={action} className="rounded-full bg-muted px-2 py-1 text-xs">
              {humanizeToken(action)}
            </li>
          ))}
        </ul>
        {finding.attackTypes.length > 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Possible categories: {finding.attackTypes.map(humanizeToken).join(", ")}.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-sm font-semibold">Advisory model output</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This panel does not authorize tools. Provider {finding.analysis.provider ?? "not called"} · {finding.analysis.status}
          {finding.analysis.model ? ` · ${finding.analysis.model}` : ""}
        </p>
        {finding.analysis.reportedConfidence !== null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Model-reported confidence {finding.analysis.reportedConfidence.toFixed(2)} is not a probability of compromise.
          </p>
        ) : null}
        <p className="mt-2 text-sm leading-6">
          {finding.analysis.advisorySummary ?? finding.analysis.error ?? "The analyzer was not called for this item."}
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-sm font-semibold">Policy decision</h2>
        <p className="mt-2 text-sm leading-6">{finding.policyReason}</p>
        {finding.policyActions.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {finding.policyActions.map((action) => (
              <li key={`${action.tool}-${action.decision}`} className="text-sm">
                <span className="font-mono">{action.tool}</span> · {action.decision} · {action.executed ? "recorded" : "not executed"}
                <span className="block text-muted-foreground">{action.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No tool call was executed.</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <h2 className="text-sm font-semibold">Audit trail</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {finding.auditLogs.map((entry) => (
            <li key={entry.id} className="text-sm">
              <p className="font-medium">
                {entry.stage} · {entry.status}
              </p>
              <p className="text-muted-foreground">{entry.policyReason}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl">{value}</p>
    </article>
  );
}
