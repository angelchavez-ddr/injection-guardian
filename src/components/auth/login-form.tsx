"use client";

import { useActionState, useState } from "react";
import { ShieldCheck, UserPlus, LogIn } from "lucide-react";
import { loginAction, registerAction, type AuthFormState } from "@/app/login/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  adminEmail: string;
  googleAuthConfigured: boolean;
  oauthError?: string;
};

export function LoginForm({
  adminEmail,
  googleAuthConfigured,
  oauthError,
}: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");

  const [loginState, loginFormAction, loginPending] = useActionState<
    AuthFormState | undefined,
    FormData
  >(loginAction, undefined);

  const [registerState, registerFormAction, registerPending] = useActionState<
    AuthFormState | undefined,
    FormData
  >(registerAction, undefined);

  const activeError =
    (mode === "login" ? loginState?.error : registerState?.error) ??
    formatOAuthError(oauthError);

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2 text-teal-400">
          <ShieldCheck className="size-5" />
          <span className="font-mono text-xs uppercase tracking-widest">SOC Access Portal</span>
        </div>
        <CardTitle className="text-xl font-semibold">Injection Guardian</CardTitle>
        <p className="text-sm text-muted-foreground">
          Inicia sesión o regístrate. Los usuarios se guardan en Turso.{" "}
          <span className="font-mono text-xs text-teal-400/90">
            Admin único: {adminEmail}
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 transition-colors ${
              mode === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="size-3.5" />
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2 transition-colors ${
              mode === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="size-3.5" />
            Registrarse
          </button>
        </div>

        {activeError && (
          <Alert className="border-red-500/40 text-red-400">{activeError}</Alert>
        )}

        <div className="space-y-3">
          {googleAuthConfigured ? (
            <a
              href="/api/auth/google/start"
              className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <GoogleIcon />
              Continuar con Google
            </a>
          ) : (
            <Alert>
              Google OAuth no está configurado (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).
            </Alert>
          )}
        </div>

        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-border" />
          <span className="bg-card px-3 text-xs uppercase text-muted-foreground">
            o con correo y contraseña
          </span>
          <div className="w-full border-t border-border" />
        </div>

        {mode === "login" ? (
          <form action={loginFormAction} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">
                Correo electrónico
              </label>
              <Input
                id="login-email"
                name="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">
                Contraseña
              </label>
              <Input
                id="login-password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginPending}>
              {loginPending ? "Iniciando sesión…" : "Iniciar Sesión"}
            </Button>
          </form>
        ) : (
          <form action={registerFormAction} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="register-name" className="text-xs font-medium text-muted-foreground">
                Nombre completo
              </label>
              <Input
                id="register-name"
                name="name"
                type="text"
                placeholder="Tu nombre"
                required
                minLength={2}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-xs font-medium text-muted-foreground">
                Correo electrónico
              </label>
              <Input
                id="register-email"
                name="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="register-password" className="text-xs font-medium text-muted-foreground">
                Contraseña (mín. 6 caracteres)
              </label>
              <Input
                id="register-password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={registerPending}>
              {registerPending ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function formatOAuthError(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }
  switch (code) {
    case "unverified_email":
      return "Google reportó que el correo electrónico no está verificado.";
    case "invalid_state":
      return "La sesión de OAuth expiró o el estado no coincide. Intenta de nuevo.";
    case "missing_code":
      return "Google no devolvió un código de autorización.";
    case "google_not_configured":
      return "Las credenciales de Google OAuth no están configuradas en el servidor.";
    default:
      return `Error de autenticación con Google: ${code}`;
  }
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.86c2.26-2.09 3.56-5.17 3.56-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.4l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09c.95-2.85 3.6-4.94 6.73-4.94z"
      />
    </svg>
  );
}
