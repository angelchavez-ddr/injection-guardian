"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type MailboxSubmitButtonProps = {
  idle: string;
  pendingLabel: string;
  variant?: "default" | "outline" | "ghost";
};

export function MailboxSubmitButton({ idle, pendingLabel, variant = "default" }: MailboxSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : idle}
    </Button>
  );
}
