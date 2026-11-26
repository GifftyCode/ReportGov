"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequireSignIn } from "@/components/RequireSignIn";
import { StatusBadge } from "@/components/StatusBadge";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function MyComplaintsPage() {
  return (
    <RequireSignIn>
      <MyComplaints />
    </RequireSignIn>
  );
}

function MyComplaints() {
  const complaints = useQuery(api.complaints.mine);

  if (complaints === undefined) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My complaints</h1>
        <Button asChild>
          <Link href="/report">New complaint</Link>
        </Button>
      </div>
      {complaints.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No complaints yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            When you report an issue, you can track it here. Updates appear live.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {complaints.map((c) => (
            <li key={c._id}>
              <Link href={`/complaints/${c.reference}`}>
                <Card className="transition-colors hover:border-primary">
                  <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.reference} · {c.mda?.acronym} · {formatDate(c._creationTime)}
                      </p>
                    </div>
                    <Countdown dueAt={c.dueAt} done={c.status === "resolved" || c.status === "escalated"} />
                    <StatusBadge status={c.status} />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
