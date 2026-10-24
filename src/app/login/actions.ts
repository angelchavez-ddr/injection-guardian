"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearUserSessionCookie,
  createUserSessionCookie,
} from "@/lib/auth/session";
import {
  authenticateUserWithCredentials,
  registerUserWithCredentials,
} from "@/server/repositories/user-repository";

export type AuthFormState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo electrónico válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().trim().email("Ingresa un correo electrónico válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export async function loginAction(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos de inicio de sesión inválidos." };
  }

  try {
    const user = await authenticateUserWithCredentials(parsed.data);
    await createUserSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      authMethod: "credentials",
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo iniciar sesión.",
    };
  }

  redirect("/dashboard");
}

export async function registerAction(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos de registro inválidos." };
  }

  try {
    const user = await registerUserWithCredentials(parsed.data);
    await createUserSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      authMethod: "credentials",
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No se pudo completar el registro.",
    };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await clearUserSessionCookie();
  redirect("/login");
}

export async function logoutAdminAction(): Promise<void> {
  return logoutAction();
}
