import "server-only";
import { parseServerEnv, type ServerEnv } from "@/lib/env/schema";

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cached) {
    cached = parseServerEnv(process.env);
  }
  return cached;
}
