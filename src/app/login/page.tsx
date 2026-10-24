import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getAdminSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env/server";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando acceso…</p>}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await getAdminSession();
  if (session) {
    redirect("/dashboard");
  }

  const env = getServerEnv();
  const params = await searchParams;
  const oauthError = first(params.error);

  return (
    <LoginForm
      adminEmail={env.ADMIN_EMAIL}
      googleAuthConfigured={env.googleAuthConfigured}
      oauthError={oauthError}
    />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
