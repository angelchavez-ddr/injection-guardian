import { createHmac, timingSafeEqual } from "node:crypto";

export function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) {
    return false;
  }
  return safeEqual(header, `Bearer ${secret}`);
}

export function vercelSignatureMatches(body: string, header: string | null, secret: string): boolean {
  if (!header) {
    return false;
  }
  const digest = createHmac("sha1", secret).update(body).digest("hex");
  return safeEqual(header, digest);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
