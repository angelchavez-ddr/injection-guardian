"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mailboxErrorCode } from "@/lib/auth/mailbox-token";
import { requireUserSession } from "@/lib/auth/session";
import { scanConnectedInbox } from "@/server/services/gmail-inbox-scan";

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
