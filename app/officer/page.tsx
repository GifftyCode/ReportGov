"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RequireSignIn } from "@/components/RequireSignIn";
import { StatusBadge, type Status } from "@/components/StatusBadge";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errorMessage, formatDate } from "@/lib/utils";

export default function OfficerPage() {
  return (
    <RequireSignIn roles={["officer"]}>
      <Inbox />
    </RequireSignIn>
  );
}

const FILTERS: { key: "active" | Status | "all"; label: string }[] = [
  { key: "active", label: "Needs action" },
  { key: "escalated", label: "Escalated" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

function Inbox() {
  const me = useQuery(api.users.me);
  const complaints = useQuery(api.complaints.inbox);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("active");

  if (complaints === undefined) return <p className="text-muted-foreground">Loading...</p>;

  const shown = complaints.filter((c) =>
    filter === "all"
      ? true
      : filter === "active"
        ? c.status === "open" || c.status === "in_progress"
        : c.status === filter,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{me?.mda?.acronym ?? "MDA"} inbox</h1>
        <p className="text-sm text-muted-foreground">
          Complaints filed against {me?.mda?.name}. Respond before the SLA deadline or they escalate to
          PEBEC.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((c) => (
            <li key={c._id}>
              <InboxItem complaint={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Item = {
  _id: Id<"complaints">;
  _creationTime: number;
  reference: string;
  title: string;
  description: string;
  status: Status;
  dueAt: number;
  responseNote?: string;
};

function InboxItem({ complaint: c }: { complaint: Item }) {
  const update = useMutation(api.complaints.updateStatus);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const closed = c.status === "resolved";

  async function act(status: "in_progress" | "resolved") {
    setError(null);
    setBusy(true);
    try {
      await update({ complaintId: c._id, status, note: note || undefined });
      setNote("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="flex-1 text-base">
            <Link href={`/complaints/${c.reference}`} className="hover:underline">
              {c.title}
            </Link>
          </CardTitle>
          <Countdown dueAt={c.dueAt} done={closed || c.status === "escalated"} />
          <StatusBadge status={c.status} />
        </div>
        <CardDescription>
          {c.reference} · received {formatDate(c._creationTime)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm">{c.description}</p>
        {closed ? (
          <p className="text-sm text-emerald-800">Resolved: {c.responseNote}</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Response note to the business"
              aria-label="Response note"
            />
            {c.status === "open" && (
              <Button variant="outline" disabled={busy} onClick={() => act("in_progress")}>
                Start
              </Button>
            )}
            <Button disabled={busy} onClick={() => act("resolved")}>
              Resolve
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </CardContent>
    </Card>
  );
}
