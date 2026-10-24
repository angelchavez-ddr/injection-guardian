import "server-only";
import { randomUUID } from "node:crypto";
import { decryptSecret, encryptSecret, MailboxAccessError } from "@/lib/auth/mailbox-token";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isAuthorizedAdminEmail, type UserRole } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { getServerEnv } from "@/lib/env/server";

export type AppUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  role: UserRole;
  authProvider: "credentials" | "google";
  lastLoginAt?: string;
  createdAt: string;
};

function resolveRoleForEmail(email: string): UserRole {
  const env = getServerEnv();
  return isAuthorizedAdminEmail(email, env) ? "admin" : "user";
}

function toAppUser(row: {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  role: string;
  authProvider: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}): AppUser {
  const role = resolveRoleForEmail(row.email);
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    picture: row.picture ?? undefined,
    role,
    authProvider: row.authProvider === "google" ? "google" : "credentials",
    lastLoginAt: row.lastLoginAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function registerUserWithCredentials(input: {
  email: string;
  name: string;
  password: string;
}): Promise<AppUser> {
  const prisma = getPrisma();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new Error("Ya existe una cuenta registrada con este correo electrónico.");
  }

  const role = resolveRoleForEmail(normalizedEmail);
  const passwordHash = hashPassword(input.password);
  const now = new Date();

  const created = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: normalizedEmail,
      name: input.name.trim(),
      passwordHash,
      role,
      authProvider: "credentials",
      lastLoginAt: now,
    },
  });

  return toAppUser(created);
}

export async function authenticateUserWithCredentials(input: {
  email: string;
  password: string;
}): Promise<AppUser> {
  const prisma = getPrisma();
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("Correo electrónico o contraseña incorrectos.");
  }

  if (!user.passwordHash) {
    throw new Error(
      "Esta cuenta fue creada con Google. Usa 'Continuar con Google' o regístrate estableciendo una contraseña.",
    );
  }

  if (!verifyPassword(input.password, user.passwordHash)) {
    throw new Error("Correo electrónico o contraseña incorrectos.");
  }

  const role = resolveRoleForEmail(normalizedEmail);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role,
      lastLoginAt: new Date(),
    },
  });

  return toAppUser(updated);
}

export async function upsertGoogleUser(input: {
  email: string;
  name?: string;
  picture?: string;
}): Promise<AppUser> {
  const prisma = getPrisma();
  const normalizedEmail = input.email.trim().toLowerCase();
  const role = resolveRoleForEmail(normalizedEmail);
  const now = new Date();

  const upserted = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: input.name ?? undefined,
      picture: input.picture ?? undefined,
      role,
      authProvider: "google",
      lastLoginAt: now,
    },
    create: {
      id: randomUUID(),
      email: normalizedEmail,
      name: input.name ?? normalizedEmail.split("@")[0],
      picture: input.picture,
      role,
      authProvider: "google",
      lastLoginAt: now,
    },
  });

  return toAppUser(upserted);
}

export type MailboxStatus = {
  connected: boolean;
  connectedAt?: string;
};

export async function getMailboxStatus(userId: string): Promise<MailboxStatus> {
  const prisma = getPrisma();
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { gmailRefreshTokenEnc: true, gmailConnectedAt: true },
  });
  if (!row?.gmailRefreshTokenEnc) {
    return { connected: false };
  }
  return {
    connected: true,
    connectedAt: row.gmailConnectedAt?.toISOString(),
  };
}

export async function saveGmailRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: {
      gmailRefreshTokenEnc: encryptSecret(refreshToken, encryptionSecret()),
      gmailConnectedAt: new Date(),
    },
  });
}

export async function loadGmailRefreshToken(userId: string): Promise<string | null> {
  const prisma = getPrisma();
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { gmailRefreshTokenEnc: true },
  });
  if (!row?.gmailRefreshTokenEnc) {
    return null;
  }
  try {
    return decryptSecret(row.gmailRefreshTokenEnc, encryptionSecret());
  } catch (error) {
    if (error instanceof MailboxAccessError) {
      throw error;
    }
    throw new MailboxAccessError("unreadable_token");
  }
}

export async function saveGmailHistoryId(userId: string, historyId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: { gmailHistoryId: historyId },
  });
}

function encryptionSecret(): string {
  const env = getServerEnv();
  const secret = env.SESSION_SECRET ?? env.GOOGLE_CLIENT_SECRET;
  if (!secret) {
    throw new MailboxAccessError("unreadable_token");
  }
  return secret;
}

export async function listAllUsers(): Promise<AppUser[]> {
  const prisma = getPrisma();
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(toAppUser);
}
