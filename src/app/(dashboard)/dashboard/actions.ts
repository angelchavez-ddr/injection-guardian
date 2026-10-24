"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mailboxErrorCode } from "@/lib/auth/mailbox-token";
import { requireUserSession } from "@/lib/auth/session";
import { normalizeGmailAppPassword } from "@/lib/connectors/email/gmail/app-password";
import { verifyGmailImapLogin } from "@/lib/connectors/email/gmail/imap-client";
import { allowRequest } from "@/lib/http/rate-limit";
import { clearGmailAppPassword, saveGmailAppPassword } from "@/server/repositories/user-repository";
import { scanConnectedInbox } from "@/server/services/gmail-inbox-scan";

const gmailUserSchema = z.string().trim().toLowerCase().email().max(254);

export async function scanInboxAction(): Promise<void> {
  const session = await requireUserSession();
  let result;
  try {
    result = await scanConnectedInbox(session);
  } catch (error) {
    redirect(`/dashboard?scan=${mailboxErrorCode(error)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/investigations");
  const params = new URLSearchParams({
    scan: "ok",
    processed: String(result.processed),
    flagged: String(result.flagged),
    skipped: String(result.skipped),
  });
  redirect(`/dashboard?${params.toString()}`);
}

export async function saveGmailAppPasswordAction(formData: FormData): Promise<void> {
  const session = await requireUserSession();
  const user = gmailUserSchema.safeParse(formData.get("gmailUser"));
  const appPassword = normalizeGmailAppPassword(readFormText(formData.get("appPassword")));
  if (!user.success || !appPassword) {
    redirect("/dashboard?mailbox=invalid_app_password");
  }
  if (!allowRequest(`gmail-imap:${session.userId}`, 5, 15 * 60 * 1000)) {
    redirect("/dashboard?mailbox=imap_attempt_limit");
  }

  try {
    const credentials = { user: user.data, appPassword };
    await verifyGmailImapLogin(credentials);
    await saveGmailAppPassword(session.userId, credentials);
  } catch (error) {
    redirect(`/dashboard?mailbox=${mailboxErrorCode(error)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/dashboard?mailbox=app_password_saved");
}

export async function disconnectGmailAppPasswordAction(): Promise<void> {
  const session = await requireUserSession();
  await clearGmailAppPassword(session.userId);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/dashboard?mailbox=app_password_removed");
}

function readFormText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
