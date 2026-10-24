import type { FindingStatus, Severity } from "@/lib/security/types";

export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function severityLabel(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function statusLabel(status: FindingStatus): string {
  switch (status) {
    case "locally_screened":
      return "Screened";
    case "queued":
      return "Queued";
    case "analyzed":
      return "Analyzed";
    case "analysis_failed":
      return "Analysis failed";
    case "review_required":
      return "Needs review";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

export function humanizeToken(value: string): string {
  return value.replaceAll("_", " ");
}
