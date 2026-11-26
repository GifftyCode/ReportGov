"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequireSignIn } from "@/components/RequireSignIn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function AdminPage() {
  return (
    <RequireSignIn roles={["admin"]}>
      <Dashboard />
    </RequireSignIn>
  );
}

function Dashboard() {
  const rows = useQuery(api.complaints.leaderboard);
  const escalated = useQuery(api.complaints.escalated);

  if (rows === undefined || escalated === undefined)
    return <p className="text-muted-foreground">Loading...</p>;

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      onTime: acc.onTime + r.resolvedOnTime,
      escalated: acc.escalated + r.escalated,
      pending: acc.pending + r.pending,
    }),
    { total: 0, onTime: 0, escalated: 0, pending: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PEBEC dashboard</h1>
        <p className="text-sm text-muted-foreground">Live MDA responsiveness. Updates as complaints change.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Complaints" value={totals.total} />
        <Stat label="Resolved on time" value={totals.onTime} />
        <Stat label="Escalated" value={totals.escalated} />
        <Stat label="Within SLA, pending" value={totals.pending} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Responsiveness leaderboard</CardTitle>
          <CardDescription>
            Score = complaints resolved within the SLA ÷ complaints whose outcome is known.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">MDA</th>
                <th className="py-2 pr-3 text-right">Total</th>
                <th className="py-2 pr-3 text-right">On time</th>
                <th className="py-2 pr-3 text-right">Escalated</th>
                <th className="py-2 pr-3 text-right">Pending</th>
                <th className="py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.mdaId} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <span className="font-medium">{r.acronym}</span>{" "}
                    <span className="hidden text-muted-foreground md:inline">{r.name}</span>
                  </td>
                  <td className="py-2 pr-3 text-right">{r.total}</td>
                  <td className="py-2 pr-3 text-right">{r.resolvedOnTime}</td>
                  <td className="py-2 pr-3 text-right">{r.escalated}</td>
                  <td className="py-2 pr-3 text-right">{r.pending}</td>
                  <td className="py-2 text-right">
                    <ScoreBadge score={r.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Escalated complaints</CardTitle>
          <CardDescription>Missed the SLA. PEBEC follows up with the MDA.</CardDescription>
        </CardHeader>
        <CardContent>
          {escalated.length === 0 ? (
            <p className="text-sm text-muted-foreground">None right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {escalated.map((c) => (
                <li key={c._id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <Badge variant="outline">{c.mda?.acronym}</Badge>
                  <Link href={`/complaints/${c.reference}`} className="flex-1 hover:underline">
                    {c.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">due {formatDate(c.dueAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  const variant = score >= 80 ? "success" : score >= 50 ? "warning" : "destructive";
  return <Badge variant={variant}>{score}%</Badge>;
}
