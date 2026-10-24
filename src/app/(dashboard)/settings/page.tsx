import { Suspense } from "react";
import { connection } from "next/server";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { requireUserSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env/server";
import { publicRuntimeConfig } from "@/lib/env/public-config";
import { GMAIL_ALLOWED_OPERATIONS } from "@/lib/connectors/email/gmail/scopes";
import { getMailboxStatus, listAllUsers } from "@/server/repositories/user-repository";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading settings…</p>}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  await connection();
  const session = await requireUserSession();
  const isAdmin = session.role === "admin";
  const config = publicRuntimeConfig(getServerEnv());
  const users = isAdmin ? await listAllUsers() : [];
  const mailbox = await getMailboxStatus(session.userId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runtime posture and role-based access control. Secrets are not shown.
        </p>
      </div>
      <Alert>
        Sesión activa como <strong>{session.email}</strong> (Rol:{" "}
        <span className="font-mono uppercase">{session.role}</span>). El único administrador del sistema es{" "}
        <strong>{config.adminEmail}</strong>.
      </Alert>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Item label="Current user" value={`${session.email} (${session.role})`} />
        <Item label="Sole Administrator" value={config.adminEmail} />
        <Item label="Authentication" value={config.authentication} />
        <Item label="Demo mode" value={config.demoMode ? "true" : "false"} />
        <Item label="Requested provider" value={config.requestedProvider} />
        <Item label="Active provider" value={`${config.activeProvider} (${config.activeModel})`} />
        <Item label="Provider note" value={config.providerReason} />
        <Item
          label="Gmail de esta cuenta"
          value={mailbox.connected ? "conectado, solo lectura" : "sin conectar"}
        />
        <Item label="Gmail scope" value={config.gmailScope} />
        <Item label="Database" value={config.databaseKind} />
      </dl>
      {isAdmin && (
        <section className="rounded-lg border border-border bg-card px-4 py-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Usuarios registrados en Turso</h2>
              <p className="text-xs text-muted-foreground">
                Visible únicamente para el administrador ({config.adminEmail}).
              </p>
            </div>
            <Badge>{users.length} usuarios</Badge>
          </div>
          {users.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Aún no hay usuarios registrados en la tabla User.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Correo</th>
                    <th className="py-2 pr-4 font-medium">Nombre</th>
                    <th className="py-2 pr-4 font-medium">Rol</th>
                    <th className="py-2 pr-4 font-medium">Método</th>
                    <th className="py-2 font-medium">Último acceso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 pr-4 font-mono">{u.email}</td>
                      <td className="py-2 pr-4">{u.name ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            u.role === "admin"
                              ? "rounded bg-teal-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-400"
                              : "rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{u.authProvider}</td>
                      <td className="py-2 text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
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
