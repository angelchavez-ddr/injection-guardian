import { ThreatRadar } from "@/components/security/threat-radar";
import { severityLabel } from "@/lib/format";
import { aggregateRadarScores } from "@/lib/security/threat-radar";
import { SEVERITIES, type DashboardSummary, type FindingView, type Severity } from "@/lib/security/types";

const numberTone: Record<Severity, string> = {
  critical: "text-rose-400",
  high: "text-orange-300",
  medium: "text-amber-300",
  low: "text-sky-300",
  info: "text-slate-300",
};

const strokeTone: Record<Severity, string> = {
  critical: "stroke-rose-400",
  high: "stroke-orange-300",
  medium: "stroke-amber-300",
  low: "stroke-sky-300",
  info: "stroke-slate-400",
};

const dotTone: Record<Severity, string> = {
  critical: "bg-rose-400",
  high: "bg-orange-300",
  medium: "bg-amber-300",
  low: "bg-sky-300",
  info: "bg-slate-400",
};

export function OverviewBoard({ summary, reviewed }: { summary: DashboardSummary; reviewed: FindingView[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_11.5rem_11.5rem]">
        <article className="rounded-xl border border-border bg-card px-5 py-4">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">Severidad</h2>
          <div className="mt-4 grid grid-cols-5 divide-x divide-border">
            {SEVERITIES.map((severity) => (
              <div key={severity} className="px-2 first:pl-0 sm:px-4">
                <p className={`text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${numberTone[severity]}`}>
                  {summary.bySeverity[severity]}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{severityLabel(severity)}</p>
              </div>
            ))}
          </div>
        </article>
        <CountTile label="Correos analizados" value={summary.emailCount} tone="text-teal-300" />
        <CountTile label="En revisión" value={summary.awaitingReview} tone="text-amber-200" />
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ReviewedRadar findings={reviewed} />
        <SeverityDonut bySeverity={summary.bySeverity} total={summary.total} />
      </div>
    </div>
  );
}

function CountTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-border bg-card px-5 py-4">
      <h2 className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">{label}</h2>
      <p className={`mt-3 text-4xl font-semibold tracking-tight tabular-nums ${tone}`}>{value}</p>
    </article>
  );
}

function ReviewedRadar({ findings }: { findings: FindingView[] }) {
  const scores = aggregateRadarScores(findings);
  const signature = `${findings.length}:${scores.phishing}:${scores.prompt_injection}:${scores.impersonation}:${scores.exfiltration}:${scores.tool_abuse}`;

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">Correos revisados</h2>
        <p className="text-xs text-muted-foreground">{findings.length}</p>
      </div>
      <div className="mx-auto w-full max-w-[460px] flex-1">
        <ThreatRadar key={signature} scores={scores} />
      </div>
    </article>
  );
}

function SeverityDonut({ bySeverity, total }: { bySeverity: Record<Severity, number>; total: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let drawn = 0;

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card px-5 py-4">
      <h2 className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">Distribución</h2>
      <div className="mt-4 flex flex-1 items-center gap-6">
        <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={`${total} hallazgos`}>
          <g transform="rotate(-90 70 70)">
            <circle cx="70" cy="70" r={radius} className="fill-none stroke-border" strokeWidth="14" />
            {SEVERITIES.map((severity) => {
              const value = bySeverity[severity];
              if (total === 0 || value === 0) {
                return null;
              }
              const length = (value / total) * circumference;
              const offset = drawn;
              drawn += length;
              return (
                <circle
                  key={severity}
                  cx="70"
                  cy="70"
                  r={radius}
                  className={`fill-none ${strokeTone[severity]}`}
                  strokeWidth="14"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </g>
          <text x="70" y="68" textAnchor="middle" className="fill-foreground text-[28px] font-semibold tabular-nums">
            {total}
          </text>
          <text x="70" y="86" textAnchor="middle" className="fill-muted-foreground text-[10px]">
            hallazgos
          </text>
        </svg>
        <ul className="flex flex-col gap-2 text-sm">
          {SEVERITIES.map((severity) => (
            <li key={severity} className="grid grid-cols-[0.5rem_5.5rem_2rem] items-center gap-2">
              <span className={`size-2 rounded-full ${dotTone[severity]}`} />
              <span>{severityLabel(severity)}</span>
              <span className="tabular-nums">{bySeverity[severity]}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
