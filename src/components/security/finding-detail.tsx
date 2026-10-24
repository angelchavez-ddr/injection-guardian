import Link from "next/link";
import { SeverityBadge } from "@/components/ui/badge";
import { ThreatRadar } from "@/components/security/threat-radar";
import { formatTimestamp, statusLabel } from "@/lib/format";
import { threatRadarScores } from "@/lib/security/threat-radar";
import {
  INDICATOR_IDS,
  type FindingView,
  type IndicatorId,
  type PolicyDecisionName,
  type RecommendedAction,
} from "@/lib/security/types";

export function FindingDetail({ finding }: { finding: FindingView }) {
  const narrative = finding.analysis.advisorySummary ?? finding.summary;

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-2">
      <section className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-border bg-card">
        <p className="pt-5 text-center font-mono text-[11px] tracking-[0.28em] text-teal-400">REPORTE AVANZADO</p>
        <div className="flex flex-1 items-center px-3 pb-2">
          <ThreatRadar scores={threatRadarScores(finding.indicators)} />
        </div>
      </section>

      <section className="flex min-h-[640px] flex-col gap-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              <Link href="/investigations" className="hover:underline">
                Hallazgos
              </Link>
              <span> · {formatTimestamp(finding.createdAt)}</span>
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{finding.subject || "Sin asunto"}</h1>
          </div>
          <SeverityBadge severity={finding.severity} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Metric label="Puntaje" value={String(finding.riskScore)} accent />
          <Metric label="Estado" value={statusLabel(finding.status)} />
          <Metric label="Política" value={policyLabel(finding.policyDecision)} />
        </div>

        <p className="line-clamp-4 text-sm leading-6">{narrative}</p>

        <div>
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">Señales</h2>
          {finding.indicators.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Ninguna señal configurada coincidió.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {finding.indicators.map((indicator) => (
                <li key={indicator.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{indicatorLabel(indicator.id, indicator.name)}</span>
                    <span className="font-mono text-xs text-muted-foreground">{indicator.weight}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-teal-300"
                      style={{ width: `${Math.min(100, (indicator.weight / 40) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{indicator.evidence}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <p className="text-sm">
            {finding.policyActions.length === 0
              ? "Ninguna herramienta se ejecutó."
              : finding.policyActions
                  .map((action) => `${action.tool} · ${action.executed ? "ejecutada" : "no ejecutada"}`)
                  .join(" · ")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {finding.recommendedActions.map((action) => (
              <li key={action} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                {actionLabel(action)}
              </li>
            ))}
          </ul>
          {finding.excerpt ? (
            <p className="line-clamp-2 rounded-md bg-muted px-3 py-2 font-mono text-xs leading-5">{finding.excerpt}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <article className="rounded-lg border border-border px-3 py-3">
      <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className={`mt-1 leading-tight tabular-nums ${accent ? "text-3xl font-semibold text-teal-300" : "text-lg"}`}>
        {value}
      </p>
    </article>
  );
}

function indicatorLabel(id: string, fallback: string): string {
  if (!isIndicatorId(id)) {
    return fallback;
  }
  switch (id) {
    case "instruction_override":
      return "Anulación de instrucciones";
    case "role_override":
      return "Suplantación de rol";
    case "system_prompt_exfiltration":
      return "Extracción del prompt";
    case "data_exfiltration":
      return "Extracción de datos";
    case "tool_abuse":
      return "Abuso de herramientas";
    case "privilege_escalation":
      return "Escalada de privilegios";
    case "obfuscation":
      return "Ofuscación";
    case "hidden_markup":
      return "Texto oculto";
    case "suspicious_link":
      return "Enlace sospechoso";
    default: {
      const unreachable: never = id;
      return unreachable;
    }
  }
}

function isIndicatorId(id: string): id is IndicatorId {
  return INDICATOR_IDS.some((indicatorId) => indicatorId === id);
}

function policyLabel(decision: PolicyDecisionName): string {
  switch (decision) {
    case "allow":
      return "Permitido";
    case "deny":
      return "Denegado";
    case "require_approval":
      return "Aprobar";
    case "fail_closed":
      return "Cerrado";
    case "not_applicable":
      return "No aplica";
    default: {
      const unreachable: never = decision;
      return unreachable;
    }
  }
}

function actionLabel(action: RecommendedAction): string {
  switch (action) {
    case "quarantine":
      return "Cuarentena";
    case "require_human_review":
      return "Revisión humana";
    case "block_tool_execution":
      return "Bloquear herramientas";
    case "strip_untrusted_instructions":
      return "Quitar instrucciones";
    case "notify_analyst":
      return "Avisar al analista";
    case "allow_with_monitoring":
      return "Monitorear";
    case "no_action":
      return "Sin acción";
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}
