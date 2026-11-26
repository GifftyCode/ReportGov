import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { title: "1. Report", body: "A business reports a service failure by a government agency (MDA)." },
  { title: "2. 72-hour clock", body: "The MDA's officers see it instantly and must respond within the SLA." },
  { title: "3. Escalate", body: "If they don't, it escalates automatically to PEBEC." },
  { title: "4. Rank", body: "PEBEC sees a live responsiveness leaderboard across MDAs." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 pt-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Report a government service failure.
          <br />
          <span className="text-primary">Track it until it&apos;s fixed.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          A small demo of a ReportGov-style complaint tracker, built with Next.js, TypeScript,
          Convex, Clerk, Tailwind and shadcn-style components.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/report">Report an issue</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/complaints">Track my complaints</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
