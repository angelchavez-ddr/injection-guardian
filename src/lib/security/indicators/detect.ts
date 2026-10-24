import { redactSensitive, type NormalizedContent } from "@/lib/security/normalization/normalize";
import { defaultIndicatorRules, type IndicatorRule } from "@/lib/security/indicators/rules";
import type { IndicatorId } from "@/lib/security/types";

export type DetectedIndicator = {
  id: IndicatorId;
  evidence: string;
};

const SUPPORTING = new Set<IndicatorId>(["obfuscation", "hidden_markup", "suspicious_link"]);

export function detectIndicators(
  normalized: NormalizedContent,
  rules: IndicatorRule[] = defaultIndicatorRules,
): DetectedIndicator[] {
  const found = new Map<IndicatorId, DetectedIndicator>();

  const add = (id: IndicatorId, evidence: string) => {
    if (!found.has(id)) {
      found.set(id, { id, evidence: redactSensitive(evidence).slice(0, 180) });
    }
  };

  for (const rule of rules) {
    const match = rule.pattern.exec(normalized.scanText);
    if (match?.index !== undefined) {
      add(rule.id, snippet(normalized.scanText, match.index, match[0].length));
    }
  }

  const hiddenText = normalized.hiddenSnippets.join("\n");
  if (hiddenText && rules.some((rule) => rule.pattern.test(hiddenText))) {
    add("hidden_markup", hiddenText);
  }

  const primaryHit = [...found.keys()].some((id) => !SUPPORTING.has(id));
  if (primaryHit && (normalized.invisibleCharacterCount > 0 || normalized.homoglyphCount > 0)) {
    const notes = [
      normalized.invisibleCharacterCount > 0
        ? `${normalized.invisibleCharacterCount} invisible characters`
        : null,
      normalized.homoglyphCount > 0 ? `${normalized.homoglyphCount} homoglyphs` : null,
    ].filter((note): note is string => note !== null);
    add("obfuscation", `Suspicious text was disguised with ${notes.join(" and ")}.`);
  }

  if (normalized.decodedBlobs.some((blob) => rules.some((rule) => rule.pattern.test(blob)))) {
    add("obfuscation", "A Base64 blob decoded to suspicious instruction text.");
  }

  if (normalized.suspiciousLinks.length > 0) {
    add("suspicious_link", normalized.suspiciousLinks.join(", "));
  }

  return [...found.values()];
}

function snippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}
