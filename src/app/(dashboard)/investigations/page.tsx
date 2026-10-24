import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ConsoleSkeleton } from "@/components/dashboard/console-skeleton";
import { FindingsTable } from "@/components/dashboard/findings-table";
import { Alert } from "@/components/ui/alert";
import { FINDING_STATUSES, SEVERITIES, type FindingStatus, type Severity } from "@/lib/security/types";
import { getInvestigationPage } from "@/server/services/security-service";

export default function InvestigationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ConsoleSkeleton />}>
      <InvestigationsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function InvestigationsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const severity = one(params.severity);
  const status = one(params.status);
  const data = await getInvestigationPage({
    severity: isSeverity(severity) ? severity : undefined,
    status: isStatus(status) ? status : undefined,
  });

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hallazgos</h1>
      </div>
      {data.locked ? (
        <Alert>Authentication is not implemented. Findings stay unavailable outside demo mode.</Alert>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Filter href="/investigations" label="All" active={!severity && !status} />
            {SEVERITIES.map((item) => (
              <Filter
                key={item}
                href={`/investigations?severity=${item}`}
                label={item}
                active={severity === item}
              />
            ))}
            {FINDING_STATUSES.map((item) => (
              <Filter
                key={item}
                href={`/investigations?status=${item}`}
                label={item.replaceAll("_", " ")}
                active={status === item}
              />
            ))}
          </div>
          <FindingsTable findings={data.findings} />
        </>
      )}
    </>
  );
}

function Filter({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
          : "rounded-full border border-border px-3 py-1 text-muted-foreground"
      }
    >
      {label}
    </Link>
  );
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isSeverity(value: string | undefined): value is Severity {
  return SEVERITIES.includes(value as Severity);
}

function isStatus(value: string | undefined): value is FindingStatus {
  return FINDING_STATUSES.includes(value as FindingStatus);
}
