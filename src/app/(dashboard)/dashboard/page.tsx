import { Suspense } from "react";
import { connection } from "next/server";
import { StatCards } from "@/components/dashboard/stat-cards";
import { FindingsTable } from "@/components/dashboard/findings-table";
import { DemoAnalysisForm } from "@/components/security/demo-analysis-form";
import { InboxScanPanel } from "@/components/security/inbox-scan-panel";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/server/services/security-service";

type DashboardSearch = {
  mailbox?: string | string[];
  scan?: string | string[];
  processed?: string | string[];
  flagged?: string | string[];
  skipped?: string | string[];
};

export default function DashboardPage(props: { searchParams: Promise<DashboardSearch> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading findings…</p>}>
      <DashboardContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: { searchParams: Promise<DashboardSearch> }) {
  await connection();
  const [data, query] = await Promise.all([getDashboardData(), searchParams]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Layered screening for direct and indirect prompt injection. Local indicators triage items before any model
          call. The policy engine, not the model, decides whether a tool may run.
        </p>
      </div>
      <Alert>
        La inyección de prompts no se puede eliminar. El escaneo de Gmail es de solo lectura: guarda un hallazgo y
        no envía, borra ni ejecuta acciones.
      </Alert>
      {data.locked || !data.session ? (
        <Alert>Inicia sesión para revisar la bandeja y los hallazgos.</Alert>
      ) : (
        <>
          <InboxScanPanel
            authMethod={data.session.authMethod}
            googleAuthConfigured={data.config.googleAuthConfigured}
            mailbox={data.mailbox}
            mailboxCode={single(query.mailbox)}
            scanCode={single(query.scan)}
            processed={single(query.processed)}
            flagged={single(query.flagged)}
            skipped={single(query.skipped)}
          />
          <StatCards summary={data.summary} />
          <Card>
            <CardHeader>
              <CardTitle>Recent security events</CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable findings={data.recent} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Analyze sample content</CardTitle>
            </CardHeader>
            <CardContent>
              <DemoAnalysisForm activeProvider={data.config.activeProvider} />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
