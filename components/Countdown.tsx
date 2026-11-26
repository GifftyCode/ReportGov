"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Live "time left before SLA deadline" label. */
export function Countdown({ dueAt, done }: { dueAt: number; done?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [done]);

  if (done) return null;
  const ms = dueAt - now;
  if (ms <= 0) return <span className="text-xs font-medium text-red-700">SLA deadline passed</span>;

  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const text = h > 0 ? `${h}h ${m}m left` : `${m}m ${s}s left`;
  return (
    <span className={cn("text-xs font-medium", ms < 3_600_000 ? "text-amber-700" : "text-muted-foreground")}>
      {text}
    </span>
  );
}
