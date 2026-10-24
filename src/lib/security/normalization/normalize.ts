import * as cheerio from "cheerio";
import { EXCERPT_CHARS } from "@/lib/security/limits";
import { EmptyContentError, InputLimitError, type ContentType } from "@/lib/security/types";

const INVISIBLE = new Set<string>([
  "\u200B",
  "\u200C",
  "\u200D",
  "\u2060",
  "\uFEFF",
  "\u00AD",
  "\u180E",
  "\u200E",
  "\u200F",
  "\u202A",
  "\u202B",
  "\u202C",
  "\u202D",
  "\u202E",
  "\u2066",
  "\u2067",
  "\u2068",
  "\u2069",
]);

const HOMOGLYPHS: Record<string, string> = {
  "\u0430": "a",
  "\u0435": "e",
  "\u043E": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0443": "y",
  "\u0445": "x",
  "\u0456": "i",
  "\u0410": "A",
  "\u0415": "E",
  "\u041E": "O",
  "\u0420": "P",
  "\u0421": "C",
  "\u0391": "A",
  "\u039F": "O",
  "\u03BF": "o",
  "\u0395": "E",
};

const HIDDEN_STYLE =
  /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|font-size\s*:\s*0/i;
const URL_PATTERN = /\b(?:https?:\/\/[^\s<>"']+|javascript:[^\s<>"']+|data:[^\s<>"']+)/gi;
const BASE64_PATTERN = /(?<![A-Za-z0-9+/])([A-Za-z0-9+/]{24,}={0,2})(?![A-Za-z0-9+/])/g;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PARTIAL_EMAIL_PATTERN = /[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,255}/gi;
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]\d{4}\b/g;
const SECRET_PATTERN = /\b(?:sk|rk|pk|ghp|gho|xox[baprs]|AKIA)[_-][A-Za-z0-9_-]*/gi;

export type NormalizedContent = {
  text: string;
  scanText: string;
  excerpt: string;
  originalLength: number;
  htmlDetected: boolean;
  invisibleCharacterCount: number;
  homoglyphCount: number;
  hiddenSnippets: string[];
  decodedBlobs: string[];
  suspiciousLinks: string[];
};

type CommentNode = {
  type?: string;
  data?: string;
  children?: CommentNode[];
};

export function normalizeContent(input: {
  content: string;
  contentType?: ContentType;
  maxChars: number;
}): NormalizedContent {
  const contentType = input.contentType ?? "text";
  if (input.content.length > input.maxChars) {
    throw new InputLimitError(input.maxChars, input.content.length);
  }

  const trimmed = input.content.trim();
  if (trimmed.length === 0) {
    throw new EmptyContentError();
  }

  const htmlDetected = shouldParseHtml(trimmed, contentType);
  const extracted = htmlDetected
    ? extractHtml(trimmed)
    : { visibleText: collapse(trimmed), hiddenSnippets: [] as string[] };

  const hiddenFolded = extracted.hiddenSnippets.map((snippet) => foldForScan(snippet).text);
  const combined = [extracted.visibleText, ...extracted.hiddenSnippets].filter(Boolean).join("\n");
  const folded = foldForScan(combined);
  const decodedBlobs = decodeSuspiciousBlobs(combined);
  const decodedFolded = decodedBlobs.map((blob) => foldForScan(blob).text);
  const scanText = [folded.text, ...decodedFolded.map((blob) => `[decoded] ${blob}`)]
    .filter(Boolean)
    .join("\n");

  return {
    text: folded.text,
    scanText,
    excerpt: redactSensitive(scanText).slice(0, EXCERPT_CHARS),
    originalLength: input.content.length,
    htmlDetected,
    invisibleCharacterCount: folded.invisibleCharacterCount,
    homoglyphCount: folded.homoglyphCount,
    hiddenSnippets: hiddenFolded,
    decodedBlobs: decodedFolded,
    suspiciousLinks: findSuspiciousLinks(trimmed),
  };
}

export function minimizeForModel(text: string, maxChars: number): { text: string; truncated: boolean } {
  const redacted = redactSensitive(text);
  if (redacted.length <= maxChars) {
    return { text: redacted, truncated: false };
  }
  return { text: redacted.slice(0, maxChars), truncated: true };
}

export function redactSensitive(text: string): string {
  return text
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PARTIAL_EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]")
    .replace(SECRET_PATTERN, "[redacted-secret]");
}

function shouldParseHtml(content: string, contentType: ContentType): boolean {
  if (contentType === "html") {
    return true;
  }
  return /<(?:html|body|div|p|span|table|a|br|img)\b|<!--/i.test(content);
}

function extractHtml(content: string): { visibleText: string; hiddenSnippets: string[] } {
  const $ = cheerio.load(content);
  const comments: string[] = [];
  const root = $.root().get(0) as unknown as CommentNode | undefined;
  if (root) {
    collectComments(root, comments);
  }

  const hidden: string[] = [];
  const hiddenNodes = $("[hidden], [aria-hidden='true'], [style]").toArray();
  for (const element of hiddenNodes) {
    const style = $(element).attr("style") ?? "";
    const explicitlyHidden =
      $(element).attr("hidden") !== undefined || $(element).attr("aria-hidden") === "true";
    if (!explicitlyHidden && !HIDDEN_STYLE.test(style)) {
      continue;
    }
    const text = collapse($(element).text());
    if (text.length > 0) {
      hidden.push(text);
    }
    $(element).remove();
  }

  $("script, style, noscript").remove();
  const visibleText = collapse($("body").text());
  const hiddenSnippets = [...hidden, ...comments.map(collapse)].filter((value) => value.length > 0);
  return { visibleText, hiddenSnippets };
}

function collectComments(node: CommentNode, comments: string[]): void {
  if (node.type === "comment" && node.data) {
    comments.push(node.data);
  }
  for (const child of node.children ?? []) {
    collectComments(child, comments);
  }
}

function foldForScan(input: string): {
  text: string;
  invisibleCharacterCount: number;
  homoglyphCount: number;
} {
  let invisibleCharacterCount = 0;
  let homoglyphCount = 0;
  let text = "";

  for (const char of input.normalize("NFC")) {
    if (INVISIBLE.has(char)) {
      invisibleCharacterCount += 1;
      continue;
    }
    const mapped = HOMOGLYPHS[char];
    if (mapped) {
      homoglyphCount += 1;
      text += mapped;
      continue;
    }
    text += char;
  }

  return { text: collapse(text), invisibleCharacterCount, homoglyphCount };
}

function decodeSuspiciousBlobs(text: string): string[] {
  const blobs: string[] = [];
  for (const match of text.matchAll(BASE64_PATTERN)) {
    if (blobs.length >= 3) {
      break;
    }
    const candidate = match[1];
    if (!candidate || candidate.length % 4 !== 0) {
      continue;
    }
    const decoded = Buffer.from(candidate, "base64").toString("utf8");
    if (decoded.length < 12 || decoded.length > 1_500) {
      continue;
    }
    if (!/^[\t\n\r\x20-\x7E]+$/.test(decoded)) {
      continue;
    }
    blobs.push(decoded);
  }
  return blobs;
}

function findSuspiciousLinks(content: string): string[] {
  const links = new Set<string>();
  for (const match of content.matchAll(URL_PATTERN)) {
    const url = match[0].replace(/[),.;]+$/, "");
    if (isSuspiciousUrl(url)) {
      links.add(url.slice(0, 180));
    }
  }
  return [...links];
}

function isSuspiciousUrl(url: string): boolean {
  if (/^javascript:/i.test(url) || /^data:/i.test(url)) {
    return true;
  }
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      return true;
    }
    const host = parsed.hostname.toLowerCase();
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes("xn--")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
