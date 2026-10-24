"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DEMO_SAMPLES } from "@/lib/demo/samples";
import type { ContentSource } from "@/lib/security/types";

const sources: ContentSource[] = ["manual", "email", "web", "file", "api"];

export function DemoAnalysisForm({ activeProvider }: { activeProvider: string }) {
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
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={300} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="source">Source</Label>
          <select
            id="source"
            value={source}
            onChange={(event) => setSource(event.target.value as ContentSource)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          >
            {sources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          required
          value={content}
          maxLength={20000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Paste a synthetic email or other untrusted text."
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={forceAnalysis}
          onChange={(event) => setForceAnalysis(event.target.checked)}
        />
        Request analyzer review even if local triage would skip it
      </label>
      <div className="flex flex-wrap gap-2">
        {DEMO_SAMPLES.slice(0, 4).map((sample) => (
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
            Load {sample.subject}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Active analyzer: {activeProvider}. Submissions are labeled as your input, not simulated mailbox data.</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Analyzing" : "Analyze"}
        </Button>
      </div>
    </form>
  );
}
