import type { FindingStatus, Severity } from "@/lib/security/types";

export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function severityLabel(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "Crítica";
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
    case "info":
      return "Info";
    default: {
      const unreachable: never = severity;
      return unreachable;
    }
  }
}

export function statusLabel(status: FindingStatus): string {
  switch (status) {
    case "locally_screened":
      return "Revisado";
    case "queued":
      return "En cola";
    case "analyzed":
      return "Analizado";
    case "analysis_failed":
      return "Falló el análisis";
    case "review_required":
      return "En revisión";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}
