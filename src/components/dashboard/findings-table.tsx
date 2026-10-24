import Link from "next/link";
import { SeverityBadge } from "@/components/ui/badge";
import { formatTimestamp, statusLabel } from "@/lib/format";
import type { FindingView, Severity } from "@/lib/security/types";

const scoreTone: Record<Severity, string> = {
  critical: "bg-rose-400",
  high: "bg-orange-300",
  medium: "bg-amber-300",
  low: "bg-sky-300",
  info: "bg-slate-400",
};

export function FindingsTable({ findings }: { findings: FindingView[] }) {
  if (findings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Todavía no hay hallazgos.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-muted/70 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">Alerta</th>
            <th className="px-3 py-2 font-medium">Severidad</th>
            <th className="px-3 py-2 font-medium">Puntaje</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => (
            <tr key={finding.id} className="border-t border-border">
              <td className="px-3 py-3">
                <Link href={`/investigations/${finding.id}`} className="font-medium hover:underline">
                  {finding.subject || finding.source}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatTimestamp(finding.createdAt)} · {statusLabel(finding.status)}
                </p>
              </td>
              <td className="px-3 py-3">
                <SeverityBadge severity={finding.severity} />
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-base tabular-nums">{finding.riskScore}</span>
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <span
                      className={`block h-full rounded-full ${scoreTone[finding.severity]}`}
                      style={{ width: `${finding.riskScore}%` }}
                    />
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
