import "server-only";
import { GoogleGenAI } from "@google/genai";
import { extractPatchedCode, fileImportsPackage } from "@/lib/patch/packages";

const MAX_SOURCE_CHARS = 12_000;

export async function proposeSourcePatch(input: {
  apiKey: string;
  model: string;
  code: string;
  path: string;
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  vulnerabilityDetails: string;
}): Promise<string | null> {
  if (input.code.length > MAX_SOURCE_CHARS || !fileImportsPackage(input.code, input.packageName)) {
    return null;
  }
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const response = await ai.models.generateContent({
    model: input.model,
    contents: [
      "Eres un ingeniero DevSecOps. Reescribe el archivo completo para que compile con la versión segura.",
      `Paquete: ${input.packageName}`,
      `Versión actual: ${input.currentVersion}`,
      `Versión segura: ${input.targetVersion}`,
      `Vulnerabilidad: ${input.vulnerabilityDetails}`,
      `Archivo: ${input.path}`,
      "Devuelve únicamente el archivo completo dentro de un bloque markdown. No expliques el cambio.",
      input.code,
    ].join("\n"),
    config: { temperature: 0 },
  });
  const text = response.text ?? "";
  const patched = extractPatchedCode(text);
  if (patched === input.code || patched.length < 10) {
    return null;
  }
  if (fileImportsPackage(input.code, input.packageName) && !patched.includes(input.packageName)) {
    return null;
  }
  return patched;
}
