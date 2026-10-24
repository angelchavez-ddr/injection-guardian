import { Suspense } from "react";
import { connection } from "next/server";
import { ConsoleSkeleton } from "@/components/dashboard/console-skeleton";
import { FindingsTable } from "@/components/dashboard/findings-table";
import { OverviewBoard } from "@/components/dashboard/overview-board";
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
    <Suspense fallback={<ConsoleSkeleton />}>
      <DashboardContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: { searchParams: Promise<DashboardSearch> }) {
  await connection();
  const [data, query] = await Promise.all([getDashboardData(), searchParams]);

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-teal-400">CONSOLA</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1>
        </div>
        <p className="text-xs text-muted-foreground">Solo lectura</p>
      </div>
      {data.locked || !data.session ? (
        <Alert>Inicia sesión para revisar la bandeja y los hallazgos.</Alert>
      ) : (
        <>
          <OverviewBoard summary={data.summary} reviewed={data.reviewed} />
          <div className="grid items-start gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>Hallazgos recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <FindingsTable findings={data.recent} />
              </CardContent>
            </Card>
            <div className="xl:col-span-2">
              <InboxScanPanel
                accountEmail="angel.chavez@ddrinnova.com"
                authMethod={data.session.authMethod}
                googleAuthConfigured={data.config.googleAuthConfigured}
                mailbox={data.mailbox}
                mailboxCode={single(query.mailbox)}
                scanCode={single(query.scan)}
                processed={single(query.processed)}
                flagged={single(query.flagged)}
                skipped={single(query.skipped)}
              />
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Probar un texto</CardTitle>
            </CardHeader>
            <CardContent>
              <DemoAnalysisForm />
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
