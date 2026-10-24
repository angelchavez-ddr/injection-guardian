import { scanInboxAction } from "@/app/(dashboard)/dashboard/actions";
import { ScanSubmitButton } from "@/components/security/scan-submit-button";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MailboxStatus } from "@/server/repositories/user-repository";

type InboxScanPanelProps = {
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
      <CardHeader>
        <CardTitle>Bandeja de Gmail</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm leading-6">
        <p className="text-muted-foreground">
          Revisa los 10 correos más recientes de la bandeja de la cuenta de Google con la que iniciaste
          sesión. Cada cuerpo se normaliza y pasa por los indicadores locales de prompt injection. El modelo
          solo opina sobre los que el triaje escala. No se envía, borra ni reenvía ningún mensaje.
        </p>
        {mailbox.connected ? (
          <p>
            Gmail conectado
            {mailbox.connectedAt ? ` desde ${new Date(mailbox.connectedAt).toLocaleString("es")}` : ""}. Permiso
            de solo lectura.
          </p>
        ) : (
          <p>Esta cuenta todavía no autorizó la lectura de Gmail.</p>
        )}
        {mailboxNotice ? <Alert>{mailboxNotice}</Alert> : null}
        {scanNotice ? <Alert>{scanNotice}</Alert> : null}
        {counts ? (
          <Alert>
            Se analizaron {counts.processed} correos nuevos. {counts.flagged} requieren revisión.{" "}
            {counts.skipped} ya estaban en el registro.
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {authMethod !== "google" ? (
            <a className={buttonVariants()} href="/api/auth/google/start">
              Entrar con Google
            </a>
          ) : null}
          {authMethod === "google" && googleAuthConfigured ? (
            <a className={buttonVariants({ variant: mailbox.connected ? "outline" : "default" })} href="/api/connectors/gmail/start">
              {mailbox.connected ? "Volver a autorizar Gmail" : "Conectar Gmail"}
            </a>
          ) : null}
          {mailbox.connected ? (
            <form action={scanInboxAction}>
              <ScanSubmitButton />
            </form>
          ) : null}
        </div>
        {authMethod === "google" && !googleAuthConfigured ? (
          <p className="text-muted-foreground">
            Faltan las credenciales OAuth de Google en el servidor para conectar la bandeja.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const MAILBOX_NOTICES = {
  connected: "Gmail quedó conectado con permiso de solo lectura. Ya puedes escanear los correos entrantes.",
  invalid_state: "La autorización venció o no coincide con esta sesión. Vuelve a conectar Gmail.",
  account_mismatch: "La cuenta de Google autorizada no es la de esta sesión. Conecta la misma cuenta.",
  unverified_email: "Google no confirmó el correo de esa cuenta.",
  no_refresh_token:
    "Google no entregó un token de actualización. Revoca el acceso de Injection Guardian en tu cuenta de Google y conecta de nuevo.",
  google_required: "Entra con Google para escanear la bandeja de esa cuenta.",
  oauth_denied: "Google no autorizó la lectura de Gmail.",
  not_connected: "Conecta Gmail antes de escanear.",
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

function isMailboxNoticeCode(code: string): code is MailboxNoticeCode {
  return Object.hasOwn(MAILBOX_NOTICES, code);
}

function readCount(value: string | undefined): number {
  if (!value || !/^\d{1,6}$/.test(value)) {
    return 0;
  }
  return Number(value);
}
