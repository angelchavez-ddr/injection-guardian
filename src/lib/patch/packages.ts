import { compareVersions, selectFixedVersion, withRangeOperator } from "@/lib/patch/versions";

export const MAX_SCANNED_PACKAGES = 100;
export const MAX_PATCHED_PACKAGES = 8;
export const MAX_SOURCE_FILES = 3;
export const MAX_SOURCE_FETCHES = 40;

export type NpmPackage = {
  name: string;
  version: string;
  range: string;
  development: boolean;
};

export type PackageVulnerability = {
  id: string;
  summary: string;
  severity: "critical" | "high" | "medium" | "low" | "unknown";
  fixedVersion?: string;
};

export type PackageReport = {
  name: string;
  version: string;
  range: string;
  development: boolean;
  vulnerabilities: PackageVulnerability[];
};

export type PatchPlan = {
  findings: Array<{
    packageName: string;
    currentVersion: string;
    fixedVersion?: string;
    osvId: string;
    summary: string;
    severity: PackageVulnerability["severity"];
    patched: boolean;
  }>;
  packageJson?: string;
  bumps: Array<{ name: string; from: string; to: string }>;
};

const SKIPPED_RANGE = /^(file:|link:|workspace:|git\+|github:|http:|https:|latest|\*)$/i;

export function collectNpmPackages(packageJsonText: string, lockText?: string): NpmPackage[] {
  const manifest = parseJsonObject(packageJsonText, "package.json");
  const locked = lockText ? readLockVersions(lockText) : new Map<string, string>();
  const packages: NpmPackage[] = [];
  appendRange(packages, readDependencyMap(manifest.dependencies), locked, false);
  appendRange(packages, readDependencyMap(manifest.devDependencies), locked, true);
  return packages.slice(0, MAX_SCANNED_PACKAGES);
}

export function buildPatchPlan(packageJsonText: string, reports: PackageReport[]): PatchPlan {
  const manifest = parseJsonObject(packageJsonText, "package.json");
  const dependencies = readDependencyMap(manifest.dependencies);
  const devDependencies = readDependencyMap(manifest.devDependencies);
  const findings: PatchPlan["findings"] = [];
  const bumps: PatchPlan["bumps"] = [];
  const chosen = new Set<string>();

  for (const report of reports) {
    for (const vulnerability of report.vulnerabilities) {
      const alreadyChosen = chosen.has(report.name);
      const patched = Boolean(
        vulnerability.fixedVersion && (alreadyChosen || bumps.length < MAX_PATCHED_PACKAGES),
      );
      findings.push({
        packageName: report.name,
        currentVersion: report.version,
        fixedVersion: vulnerability.fixedVersion,
        osvId: vulnerability.id,
        summary: vulnerability.summary,
        severity: vulnerability.severity,
        patched,
      });
      if (patched && vulnerability.fixedVersion) {
        const existing = bumps.find((bump) => bump.name === report.name);
        if (!existing) {
          chosen.add(report.name);
          const range = dependencies.get(report.name) ?? devDependencies.get(report.name) ?? report.range;
          bumps.push({ name: report.name, from: range, to: vulnerability.fixedVersion });
        } else if (compareVersions(vulnerability.fixedVersion, existing.to) === 1) {
          existing.to = vulnerability.fixedVersion;
        }
      }
    }
  }

  if (bumps.length === 0) {
    return { findings, bumps };
  }

  for (const bump of bumps) {
    const next = withRangeOperator(bump.from, bump.to);
    if (dependencies.has(bump.name)) {
      dependencies.set(bump.name, next);
    }
    if (devDependencies.has(bump.name)) {
      devDependencies.set(bump.name, next);
    }
  }
  if (isJsonObject(manifest.dependencies)) {
    manifest.dependencies = Object.fromEntries(dependencies);
  }
  if (isJsonObject(manifest.devDependencies)) {
    manifest.devDependencies = Object.fromEntries(devDependencies);
  }
  return {
    findings,
    bumps,
    packageJson: `${JSON.stringify(manifest, null, 2)}\n`,
  };
}

export function fileImportsPackage(source: string, packageName: string): boolean {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:from|import|require)\\s*\\(?\\s*["']${escaped}(?:\\/[^"']*)?["']`,
    "m",
  );
  return pattern.test(source);
}

export function extractPatchedCode(text: string): string {
  const fenced = /```(?:typescript|tsx|javascript|js|jsx)?\s*\n([\s\S]*?)```/i.exec(text);
  const code = (fenced?.[1] ?? text).trim();
  if (code.length < 1) {
    throw new Error("Gemini no devolvió código.");
  }
  return code;
}

export function resolveRepository(
  owner: string | undefined,
  repo: string | undefined,
): { owner: string; repo: string } | null {
  const repoValue = repo?.trim();
  const ownerValue = owner?.trim();
  if (repoValue?.includes("/")) {
    const [repoOwner, repoName, extra] = repoValue.split("/");
    if (!repoOwner || !repoName || extra) {
      return null;
    }
    if (ownerValue && ownerValue !== repoOwner) {
      return { owner: ownerValue, repo: repoName };
    }
    return { owner: repoOwner, repo: repoName };
  }
  if (!ownerValue || !repoValue) {
    return null;
  }
  return { owner: ownerValue, repo: repoValue };
}

export function selectFixedFromRanges(
  current: string,
  ranges: Array<Array<{ fixed?: string }>>,
): string | undefined {
  const fixed = ranges.flatMap((events) => events.flatMap((event) => (event.fixed ? [event.fixed] : [])));
  return selectFixedVersion(current, fixed);
}

function appendRange(
  target: NpmPackage[],
  ranges: Map<string, string>,
  locked: Map<string, string>,
  development: boolean,
): void {
  for (const [name, range] of ranges) {
    if (SKIPPED_RANGE.test(range) || target.some((item) => item.name === name)) {
      continue;
    }
    const lockedVersion = locked.get(name);
    const exact = range.replace(/^(>=|<=|\^|~|>|<|=)\s*/, "");
    const version = lockedVersion ?? (/^\d+\.\d+\.\d+/.test(exact) ? exact : undefined);
    if (!version) {
      continue;
    }
    target.push({ name, version, range, development });
  }
}

function readLockVersions(lockText: string): Map<string, string> {
  const lock = parseJsonObject(lockText, "package-lock.json");
  const versions = new Map<string, string>();
  const packages = lock.packages;
  if (!isJsonObject(packages)) {
    return versions;
  }
  for (const [path, value] of Object.entries(packages)) {
    if (!path.startsWith("node_modules/") || !isJsonObject(value) || typeof value.version !== "string") {
      continue;
    }
    const name = path.slice("node_modules/".length);
    if (!name.startsWith("@") && name.includes("/")) {
      continue;
    }
    if (name.startsWith("@")) {
      const parts = name.split("/");
      if (parts.length > 2) {
        continue;
      }
    }
    versions.set(name, value.version);
  }
  return versions;
}

function readDependencyMap(value: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!isJsonObject(value)) {
    return map;
  }
  for (const [name, range] of Object.entries(value)) {
    if (typeof range === "string" && name.trim().length > 0) {
      map.set(name, range);
    }
  }
  return map;
}

function parseJsonObject(text: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label} no es JSON válido.`);
  }
  if (!isJsonObject(parsed)) {
    throw new Error(`${label} no es un objeto JSON.`);
  }
  return parsed;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
