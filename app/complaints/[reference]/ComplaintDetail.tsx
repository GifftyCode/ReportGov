"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequireSignIn } from "@/components/RequireSignIn";
import { StatusBadge } from "@/components/StatusBadge";
import { Countdown } from "@/components/Countdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function ComplaintDetail({ reference }: { reference: string }) {
  return (
    <RequireSignIn>
      <Detail reference={reference} />
    </RequireSignIn>
  );
}

function Detail({ reference }: { reference: string }) {
  const c = useQuery(api.complaints.get, { reference });

  if (c === undefined) return <p className="text-muted-foreground">Loading...</p>;
  if (c === null)
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <CardTitle>Complaint not found</CardTitle>
          <CardDescription>It doesn&apos;t exist, or you don&apos;t have access to it.</CardDescription>
        </CardHeader>
      </Card>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/complaints" className="text-sm text-muted-foreground hover:underline">
        ← My complaints
      </Link>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex-1">{c.title}</CardTitle>
            <StatusBadge status={c.status} />
          </div>
          <CardDescription>
            {c.reference} · {c.mda?.name} · submitted {formatDate(c._creationTime)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm">{c.description}</p>
          <div className="flex items-center justify-between rounded-md bg-muted p-3 text-sm">
            <span>Response due {formatDate(c.dueAt)}</span>
            <Countdown dueAt={c.dueAt} done={c.status === "resolved" || c.status === "escalated"} />
          </div>
          {c.responseNote && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-medium text-emerald-900">Response from {c.mda?.acronym}</p>
              <p className="text-emerald-900">{c.responseNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 border-l border-border pl-4">
            {c.events.map((e) => (
              <li key={e._id} className="text-sm">
                <p>
                  <span className="font-medium">{e.action}</span>{" "}
                  <span className="text-muted-foreground">by {e.actor}</span>
                </p>
                {e.note && <p className="text-muted-foreground">“{e.note}”</p>}
                <p className="text-xs text-muted-foreground">{formatDate(e._creationTime)}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
