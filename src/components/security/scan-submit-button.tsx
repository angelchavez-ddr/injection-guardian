"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function ScanSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Escaneando correos…" : "Escanear correos entrantes"}
    </Button>
  );
}
