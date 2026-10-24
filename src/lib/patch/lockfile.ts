import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function refreshNpmLockfile(packageJson: string, lockfile: string): Promise<string | null> {
  const directory = await mkdtemp(path.join(tmpdir(), "patch-agent-"));
  try {
    await writeFile(path.join(directory, "package.json"), packageJson, "utf8");
    await writeFile(path.join(directory, "package-lock.json"), lockfile, "utf8");
    await execFileAsync("npm", ["install", "--package-lock-only", "--ignore-scripts"], {
      cwd: directory,
      timeout: 120_000,
    });
    return await readFile(path.join(directory, "package-lock.json"), "utf8");
  } catch {
    return null;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
