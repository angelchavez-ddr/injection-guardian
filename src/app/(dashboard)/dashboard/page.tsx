import { Suspense } from "react";
import { connection } from "next/server";
import { StatCards } from "@/components/dashboard/stat-cards";
import { FindingsTable } from "@/components/dashboard/findings-table";
import { DemoAnalysisForm } from "@/components/security/demo-analysis-form";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/server/services/security-service";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading findings…</p>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const data = await getDashboardData();

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
        Local demo only. Prompt injection cannot be eliminated. Counts on this page come from the local audit log,
        including clearly labeled simulated mailbox samples.
      </Alert>
      {data.locked ? (
        <Alert>Authentication is not implemented. Set DEMO_MODE=true to use the local console.</Alert>
      ) : (
        <>
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
