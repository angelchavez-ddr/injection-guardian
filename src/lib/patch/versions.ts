export type VersionParts = {
  numbers: number[];
  prerelease: boolean;
};

const VERSION_PATTERN = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+].+)?$/i;

export function parseVersion(value: string): VersionParts | null {
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const numbers = [match[1], match[2] ?? "0", match[3] ?? "0"].map((part) => Number(part));
  if (numbers.some((part) => Number.isNaN(part))) {
    return null;
  }
  return { numbers, prerelease: /[-+]/.test(value) };
}

export function compareVersions(left: string, right: string): number | null {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) {
    return null;
  }
  for (let index = 0; index < 3; index += 1) {
    const delta = (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0);
    if (delta !== 0) {
      return delta > 0 ? 1 : -1;
    }
  }
  if (a.prerelease === b.prerelease) {
    return 0;
  }
  return a.prerelease ? -1 : 1;
}

export function selectFixedVersion(current: string, fixedVersions: string[]): string | undefined {
  const comparable = fixedVersions.filter((version) => compareVersions(version, current) !== null);
  const newer = comparable.filter((version) => compareVersions(version, current) === 1);
  if (newer.length > 0) {
    return [...newer].sort((left, right) => compareVersions(left, right) ?? 0)[0];
  }
  if (comparable.length === 0) {
    return fixedVersions[0];
  }
  return undefined;
}

export function withRangeOperator(currentRange: string, version: string): string {
  const match = /^(>=|<=|\^|~|>|<|=)?\s*/.exec(currentRange.trim());
  const operator = match?.[1] ?? "";
  return `${operator}${version}`;
}
