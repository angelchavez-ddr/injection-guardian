import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-3 px-6">
      <h1 className="text-2xl font-semibold">Injection Guardian</h1>
      <p className="text-sm text-muted-foreground">Local demo console for layered prompt-injection review.</p>
      <Link href="/dashboard" className="text-sm underline">
        Open the console
      </Link>
    </main>
  );
}
