"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DEMO_QUICK_LOADS, sampleById } from "@/lib/demo/samples";
import type { ContentSource } from "@/lib/security/types";

const sources: ContentSource[] = ["manual", "email", "web", "file", "api"];

function sourceLabel(source: ContentSource): string {
  switch (source) {
    case "manual":
      return "Manual";
    case "email":
      return "Correo";
    case "web":
      return "Web";
    case "file":
      return "Archivo";
    case "api":
      return "API";
    default: {
      const unreachable: never = source;
      return unreachable;
    }
  }
}

export function DemoAnalysisForm() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState<ContentSource>("manual");
  const [forceAnalysis, setForceAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/security/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content,
          subject: subject || undefined,
          source,
          contentType: content.includes("<html") || content.includes("<div") ? "html" : "text",
          forceAnalysis,
        }),
      });
      const raw = await response.text();
      let body: { eventId?: string; error?: { message?: string } } = {};
      try {
        body = JSON.parse(raw) as { eventId?: string; error?: { message?: string } };
      } catch {
        setError("The analysis service returned an unreadable response.");
        return;
      }
      if (!response.ok || !body.eventId) {
        setError(body.error?.message ?? "Analysis failed.");
        return;
      }
      router.push(`/investigations/${body.eventId}`);
      router.refresh();
    } catch {
      setError("The analysis request could not be sent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="subject">Asunto</Label>
          <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={300} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="source">Origen</Label>
          <select
            id="source"
            value={source}
            onChange={(event) => setSource(event.target.value as ContentSource)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          >
            {sources.map((item) => (
              <option key={item} value={item}>
                {sourceLabel(item)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="content">Contenido</Label>
        <Textarea
          id="content"
          required
          value={content}
          maxLength={20000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Pega un correo de prueba u otro texto no confiable."
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={forceAnalysis}
          onChange={(event) => setForceAnalysis(event.target.checked)}
        />
        Pedir reporte aunque el triaje local lo deje pasar
      </label>
      <div className="flex flex-wrap gap-2">
        {DEMO_QUICK_LOADS.map((id) => sampleById(id))
          .filter((sample) => sample !== undefined)
          .map((sample) => (
          <Button
            key={sample.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSubject(sample.subject);
              setContent(sample.content);
              setSource(sample.source);
            }}
          >
            {sample.subject}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Analizando" : "Analizar"}
        </Button>
      </div>
    </form>
  );
}
