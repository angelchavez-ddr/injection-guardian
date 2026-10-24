import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FindingDetail } from "@/components/security/finding-detail";
import { Alert } from "@/components/ui/alert";
import { getInvestigation } from "@/server/services/security-service";

export default function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading finding…</p>}>
      <InvestigationContent params={params} />
    </Suspense>
  );
}

async function InvestigationContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const result = await getInvestigation(id);
  if (result.locked) {
    return <Alert>Authentication is not implemented. This finding is unavailable outside demo mode.</Alert>;
  }
  if (!result.finding) {
    notFound();
  }
  return <FindingDetail finding={result.finding} />;
}
