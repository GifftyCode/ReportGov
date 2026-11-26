"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RequireSignIn } from "@/components/RequireSignIn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { errorMessage } from "@/lib/utils";

export default function ReportPage() {
  return (
    <RequireSignIn>
      <ReportForm />
    </RequireSignIn>
  );
}

function ReportForm() {
  const router = useRouter();
  const mdas = useQuery(api.mdas.list);
  const create = useMutation(api.complaints.create);

  const [mdaId, setMdaId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mdaId) return setError("Please choose the agency.");
    setSubmitting(true);
    try {
      const reference = await create({ mdaId: mdaId as Id<"mdas">, title, description });
      router.push(`/complaints/${reference}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Report an issue</CardTitle>
        <CardDescription>
          Tell us which agency failed to deliver a service. They have 72 hours to respond.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="mda">Agency (MDA)</Label>
            <Select id="mda" value={mdaId} onChange={(e) => setMdaId(e.target.value)} required>
              <option value="">{mdas === undefined ? "Loading..." : "Choose an agency"}</option>
              {mdas?.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.acronym} — {m.name}
                </option>
              ))}
            </Select>
            {mdas?.length === 0 && (
              <p className="text-xs text-amber-700">No MDAs yet. Run: npx convex run mdas:seed</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Short title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Container release delayed beyond published timeline"
              minLength={5}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">What happened?</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include dates, the office or port, and any reference numbers."
              minLength={20}
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground">{description.length}/2000</p>
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit complaint"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
