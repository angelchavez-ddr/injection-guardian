import {
  disconnectGmailAppPasswordAction,
  saveGmailAppPasswordAction,
  scanInboxAction,
} from "@/app/(dashboard)/dashboard/actions";
import { MailboxSubmitButton } from "@/components/security/mailbox-submit-button";
import { ScanSubmitButton } from "@/components/security/scan-submit-button";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { MailboxStatus } from "@/server/repositories/user-repository";

type InboxScanPanelProps = {
  accountEmail: string;
  authMethod: "google" | "credentials";
  googleAuthConfigured: boolean;
  mailbox: MailboxStatus;
  mailboxCode?: string;
  scanCode?: string;
  processed?: string;
  flagged?: string;
  skipped?: string;
};

export function InboxScanPanel({
  accountEmail,
  authMethod,
  googleAuthConfigured,
  mailbox,
  mailboxCode,
  scanCode,
  processed,
  flagged,
  skipped,
}: InboxScanPanelProps) {
  const mailboxNotice = mailboxNoticeFor(mailboxCode);
  const scanNotice = scanCode === "ok" ? null : mailboxNoticeFor(scanCode);
  const counts =
    scanCode === "ok"
      ? {
          processed: readCount(processed),
          flagged: readCount(flagged),
          skipped: readCount(skipped),
        }
      : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Bandeja</CardTitle>
          <MailboxStatusLine mailbox={mailbox} />
        </div>
        <form action={scanInboxAction}>
          <ScanSubmitButton />
        </form>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {counts ? (
          <p className="font-mono text-xs text-teal-300">
            Último escaneo · {counts.processed} nuevos · {counts.flagged} en revisión · {counts.skipped} ya registrados
          </p>
        ) : null}
        {mailboxNotice ? <Alert>{mailboxNotice}</Alert> : null}
        {scanNotice ? <Alert>{scanNotice}</Alert> : null}
        <form action={saveGmailAppPasswordAction} className="grid gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="gmail-user">Correo</Label>
            <Input
              id="gmail-user"
              name="gmailUser"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              key={mailbox.mailboxEmail ?? accountEmail}
              defaultValue={mailbox.mailboxEmail ?? accountEmail}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="gmail-app-password">Contraseña de aplicación</Label>
            <Input
              id="gmail-app-password"
              name="appPassword"
              type="password"
              required
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              placeholder="16 letras"
            />
          </div>
          <MailboxSubmitButton idle="Guardar" pendingLabel="Comprobando…" />
        </form>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {authMethod !== "google" ? (
            <a className={buttonVariants({ variant: "ghost", size: "sm" })} href="/api/auth/google/start">
              Entrar con Google
            </a>
          ) : null}
          {authMethod === "google" && googleAuthConfigured ? (
            <a className={buttonVariants({ variant: "ghost", size: "sm" })} href="/api/connectors/gmail/start">
              {mailbox.method === "oauth" ? "Renovar OAuth" : "OAuth"}
            </a>
          ) : null}
          {mailbox.method === "app_password" ? (
            <form action={disconnectGmailAppPasswordAction}>
              <MailboxSubmitButton idle="Desconectar" pendingLabel="Quitando…" variant="ghost" />
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

const MAILBOX_NOTICES = {
  connected: "Bandeja lista. Solo lectura.",
  app_password_saved: "Bandeja conectada. Solo lectura.",
  app_password_removed: "Bandeja desconectada.",
  invalid_app_password:
    "Escribe un correo válido y la contraseña de aplicación de 16 letras. Puedes pegarla con los espacios que muestra Google.",
  imap_auth_failed:
    "Gmail rechazó ese correo o la contraseña de aplicación. Revisa la verificación en dos pasos y que IMAP esté activado en Gmail.",
  imap_attempt_limit: "Demasiados intentos de conexión. Espera unos minutos antes de volver a guardar la contraseña.",
  encryption_unavailable:
    "El servidor no tiene SESSION_SECRET ni GOOGLE_CLIENT_SECRET para cifrar la contraseña. Configura uno y vuelve a intentarlo.",
  invalid_state: "La autorización venció o no coincide con esta sesión. Vuelve a conectar Gmail.",
  account_mismatch: "La cuenta de Google autorizada no es la de esta sesión. Conecta la misma cuenta.",
  unverified_email: "Google no confirmó el correo de esa cuenta.",
  no_refresh_token:
    "Google no entregó un token de actualización. Revoca el acceso de Injection Guardian en tu cuenta de Google y conecta de nuevo.",
  google_required: "Conecta la bandeja con una contraseña de aplicación, o entra con Google para usar OAuth.",
  oauth_denied: "Google no autorizó la lectura de Gmail.",
  not_connected:
    "Guarda la contraseña de aplicación y espera a que Gmail confirme la bandeja. Después ya puedes escanear.",
  unreadable_token: "No se pudo leer la credencial guardada. Vuelve a conectar Gmail.",
  gmail_denied: "Gmail rechazó el acceso. Vuelve a conectar la bandeja.",
  gmail_rate_limit: "Gmail limitó las consultas. Espera unos minutos y vuelve a escanear.",
  gmail_failed: "No se pudo leer la bandeja.",
} as const;

type MailboxNoticeCode = keyof typeof MAILBOX_NOTICES;

function mailboxNoticeFor(code: string | undefined): string | null {
  if (!code || !isMailboxNoticeCode(code)) {
    return null;
  }
  switch (code) {
    case "connected":
    case "app_password_saved":
    case "app_password_removed":
    case "invalid_app_password":
    case "imap_auth_failed":
    case "imap_attempt_limit":
    case "encryption_unavailable":
    case "invalid_state":
    case "account_mismatch":
    case "unverified_email":
    case "no_refresh_token":
    case "google_required":
    case "oauth_denied":
    case "not_connected":
    case "unreadable_token":
    case "gmail_denied":
    case "gmail_rate_limit":
    case "gmail_failed":
      return MAILBOX_NOTICES[code];
    default: {
      const unreachable: never = code;
      return unreachable;
    }
  }
}

function MailboxStatusLine({ mailbox }: { mailbox: MailboxStatus }) {
  const connectedAt = mailbox.connectedAt ? ` desde ${new Date(mailbox.connectedAt).toLocaleString("es")}` : "";
  switch (mailbox.method) {
    case "app_password":
      return (
        <p className="mt-1 text-xs text-muted-foreground">
          IMAP · {mailbox.mailboxEmail}
          {connectedAt} · solo lectura
        </p>
      );
    case "oauth":
      return <p className="mt-1 text-xs text-muted-foreground">OAuth{connectedAt} · solo lectura</p>;
    case undefined:
      return <p className="mt-1 text-xs text-muted-foreground">Sin bandeja</p>;
    default: {
      const unreachable: never = mailbox.method;
      return unreachable;
    }
  }
}

function isMailboxNoticeCode(code: string): code is MailboxNoticeCode {
  return Object.hasOwn(MAILBOX_NOTICES, code);
}

function readCount(value: string | undefined): number {
  if (!value || !/^\d{1,6}$/.test(value)) {
    return 0;
  }
  return Number(value);
}
