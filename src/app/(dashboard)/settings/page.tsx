import { Suspense } from "react";
import { connection } from "next/server";
import { Alert } from "@/components/ui/alert";
import { getServerEnv } from "@/lib/env/server";
import { publicRuntimeConfig } from "@/lib/env/public-config";
import { GMAIL_ALLOWED_OPERATIONS } from "@/lib/connectors/email/gmail/scopes";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading settings…</p>}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  await connection();
  const config = publicRuntimeConfig(getServerEnv());

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Runtime posture for this local process. Secrets are not shown.</p>
      </div>
      <Alert>
        This bootstrap has no authentication. Do not expose it beyond your machine until access control, a token
        store, and an approval workflow exist.
      </Alert>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Item label="Demo mode" value={config.demoMode ? "true" : "false"} />
        <Item label="Requested provider" value={config.requestedProvider} />
        <Item label="Active provider" value={`${config.activeProvider} (${config.activeModel})`} />
        <Item label="Provider note" value={config.providerReason} />
        <Item label="Gmail OAuth" value={config.gmailConfigured ? "configured" : "using synthetic mailbox"} />
        <Item label="Gmail scope" value={config.gmailScope} />
        <Item label="Database" value={config.databaseKind} />
        <Item label="Authentication" value={config.authentication} />
      </dl>
      <section className="rounded-lg border border-border bg-card px-4 py-4 text-sm leading-6">
        <h2 className="font-semibold">Guardian rules in this build</h2>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
          <li>External content is untrusted data, never an instruction to the policy engine.</li>
          <li>Model output cannot grant permissions, change policy, or authorize itself.</li>
          <li>Gmail operations are limited to {GMAIL_ALLOWED_OPERATIONS.join(", ")}.</li>
          <li>Send, delete, account changes, secret reads, and command execution are denied.</li>
          <li>Sensitive simulated actions stay unexecuted until a human approval control exists.</li>
          <li>If a proposed action cannot be validated, the decision fails closed.</li>
        </ul>
      </section>
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
