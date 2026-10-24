import { Suspense } from "react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 bg-sidebar text-sidebar-foreground md:min-h-screen md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-teal-300/80">SOC CONSOLE</p>
            <p className="mt-1 text-base font-semibold">Injection Guardian</p>
          </div>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>
        <div className="px-3 pb-4">
          <Suspense fallback={<p className="px-3 text-sm text-sidebar-muted">Loading navigation</p>}>
            <SidebarNav />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="hidden items-center justify-between border-b border-border px-6 py-3 md:flex">
          <p className="text-sm text-muted-foreground">Local demo. External content is untrusted data.</p>
          <ThemeToggle />
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
