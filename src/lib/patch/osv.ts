import { z } from "zod";
import { selectFixedFromRanges, type PackageVulnerability } from "@/lib/patch/packages";

const OSV_QUERY_URL = "https://api.osv.dev/v1/querybatch";
const BATCH_SIZE = 32;

const vulnSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  details: z.string().optional(),
  severity: z
    .array(
      z.object({
        type: z.string().optional(),
        score: z.string().optional(),
      }),
    )
    .optional(),
  database_specific: z
    .object({
      severity: z.string().optional(),
    })
    .optional(),
  affected: z
    .array(
      z.object({
        ranges: z
          .array(
            z.object({
              events: z
                .array(
                  z.object({
                    introduced: z.string().optional(),
                    fixed: z.string().optional(),
                  }),
                )
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

const batchSchema = z.object({
  results: z.array(
    z.object({
      vulns: z.array(vulnSchema).optional(),
    }),
  ),
});

export type OsvQuery = {
  name: string;
  version: string;
};

export async function queryNpmVulnerabilities(
  packages: OsvQuery[],
  fetchImpl: typeof fetch = fetch,
): Promise<PackageVulnerability[][]> {
  const results: PackageVulnerability[][] = [];
  for (let index = 0; index < packages.length; index += BATCH_SIZE) {
    const chunk = packages.slice(index, index + BATCH_SIZE);
    const response = await fetchImpl(OSV_QUERY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        queries: chunk.map((item) => ({
          package: { name: item.name, ecosystem: "npm" },
          version: item.version,
        })),
      }),
    });
    if (!response.ok) {
      throw new Error(`OSV respondió ${response.status}.`);
    }
    const parsed = batchSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error("OSV devolvió una respuesta que no se pudo leer.");
    }
    results.push(
      ...parsed.data.results.map((result, resultIndex) => {
        const current = chunk[resultIndex]?.version ?? "0.0.0";
        return (result.vulns ?? []).map((vuln) => toVulnerability(vuln, current));
      }),
    );
  }
  return results;
}

export function toVulnerability(
  vuln: z.infer<typeof vulnSchema>,
  currentVersion: string,
): PackageVulnerability {
  const ranges = (vuln.affected ?? []).flatMap((affected) =>
    (affected.ranges ?? []).map((range) => range.events ?? []),
  );
  return {
    id: vuln.id,
    summary: (vuln.summary ?? vuln.details ?? "Vulnerabilidad sin resumen.").slice(0, 500),
    severity: severityOf(vuln),
    fixedVersion: selectFixedFromRanges(currentVersion, ranges),
  };
}

function severityOf(vuln: z.infer<typeof vulnSchema>): PackageVulnerability["severity"] {
  const named = vuln.database_specific?.severity?.toLowerCase();
  if (named === "critical" || named === "high" || named === "medium" || named === "low") {
    return named;
  }
  const numeric = vuln.severity
    ?.map((item) => Number(item.score))
    .find((score) => Number.isFinite(score));
  if (numeric === undefined) {
    return "unknown";
  }
  if (numeric >= 9) {
    return "critical";
  }
  if (numeric >= 7) {
    return "high";
  }
  if (numeric >= 4) {
    return "medium";
  }
  return "low";
}
