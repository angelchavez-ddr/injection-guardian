import { severityLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/security/types";

const severityClass: Record<Severity, string> = {
  critical: "bg-rose-600/15 text-rose-700 dark:text-rose-300",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  low: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  info: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge className={severityClass[severity]}>{severityLabel(severity)}</Badge>;
}
