import Link from "next/link";
import { SeverityBadge } from "@/components/ui/badge";
import { formatTimestamp, statusLabel } from "@/lib/format";
import type { FindingView } from "@/lib/security/types";

export function FindingsTable({ findings }: { findings: FindingView[] }) {
  if (findings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No findings match this view.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-muted/70 text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Severity</th>
            <th className="px-3 py-2 font-medium">Score</th>
            <th className="px-3 py-2 font-medium">Status</th>
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
                  {finding.source}
                  {finding.simulated ? " · simulated" : ""}
                  {finding.metadataOnly ? " · metadata only" : ""}
                </p>
              </td>
              <td className="px-3 py-3 font-mono text-xs">{formatTimestamp(finding.createdAt)} UTC</td>
              <td className="px-3 py-3">
                <SeverityBadge severity={finding.severity} />
              </td>
              <td className="px-3 py-3 font-mono">{finding.riskScore}</td>
              <td className="px-3 py-3">{statusLabel(finding.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
