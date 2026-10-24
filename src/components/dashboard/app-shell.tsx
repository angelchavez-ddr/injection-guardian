import { Suspense } from "react";
import { LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { requireUserSession } from "@/lib/auth/session";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col justify-between border-b border-white/10 bg-sidebar text-sidebar-foreground md:min-h-screen md:border-r md:border-b-0">
        <div>
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
        </div>
        <div className="border-t border-white/10 px-4 py-3">
          <Suspense fallback={<p className="text-xs text-sidebar-muted">Verifying session…</p>}>
            <UserSessionBadge />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="hidden items-center justify-between border-b border-border px-6 py-3 md:flex">
          <p className="text-sm text-muted-foreground">SOC Console. External content is untrusted data.</p>
          <ThemeToggle />
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Verifying session…</p>}>
            <ProtectedContent>{children}</ProtectedContent>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

async function ProtectedContent({ children }: { children: React.ReactNode }) {
  await requireUserSession();
  return <>{children}</>;
}

async function UserSessionBadge() {
  const session = await requireUserSession();
  const isAdmin = session.role === "admin";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs">
        {isAdmin ? (
          <ShieldCheck className="size-4 shrink-0 text-teal-400" />
        ) : (
          <UserIcon className="size-4 shrink-0 text-sidebar-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sidebar-foreground">
            {session.name ?? session.email}
          </p>
          <p className="truncate text-[11px] text-sidebar-muted">{session.email}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-teal-400/90">
            {isAdmin ? "Administrador" : "Usuario"} ·{" "}
            {session.authMethod === "google" ? "Google" : "Credenciales"}
          </p>
        </div>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
        >
          <LogOut className="size-3.5" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
