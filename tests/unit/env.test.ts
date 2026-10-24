import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/schema";
import { publicRuntimeConfig } from "@/lib/env/public-config";

describe("server environment", () => {
  it("starts in demo mode with a local database when credentials are absent", () => {
    const env = parseServerEnv({});
    const config = publicRuntimeConfig(env);
    expect(env.demoMode).toBe(true);
    expect(env.DATABASE_URL).toBe("file:./dev.db");
    expect(env.databaseKind).toBe("local-sqlite");
    expect(env.gmailConfigured).toBe(false);
    expect(config.activeProvider).toBe("mock");
    expect(config.authentication).toBe("not_implemented");
    expect(JSON.stringify(config)).not.toContain("sk-");
  });

  it("keeps Grok selected when a key is present", () => {
    const env = parseServerEnv({ AI_PROVIDER: "grok", XAI_API_KEY: "xai-test", DEMO_MODE: "true" });
    expect(publicRuntimeConfig(env).activeProvider).toBe("grok");
  });

  it("maps TURSO_DATABASE_URL, TURSO_DATABASE_KEY, and auto-selects Gemini when GEMINI_API_KEY is present", () => {
    const env = parseServerEnv({
      GEMINI_API_KEY: "gemini-test",
      GEMINI_NAME: "malware",
      GEMINI_PROJECT_NAME: "projects/409132996231",
      GEMINI_PROJECT_NUMBER: "409132996231",
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_DATABASE_KEY: "turso-token",
      DEMO_MODE: "true",
    });
    const config = publicRuntimeConfig(env);
    expect(env.DATABASE_URL).toBe("libsql://example.turso.io");
    expect(env.TURSO_AUTH_TOKEN).toBe("turso-token");
    expect(env.databaseKind).toBe("libsql");
    expect(env.AI_PROVIDER).toBe("gemini");
    expect(config.activeProvider).toBe("gemini");
  });

  it("rejects an unknown provider", () => {
    expect(() => parseServerEnv({ AI_PROVIDER: "claude" })).toThrow(/Invalid server environment/);
  });
});
