import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6", className)}
      {...props}
    />
  );
}
