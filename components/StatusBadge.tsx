import { Badge } from "@/components/ui/badge";

const styles = {
  open: { label: "Open", variant: "secondary" },
  in_progress: { label: "In progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  escalated: { label: "Escalated", variant: "destructive" },
} as const;

export type Status = keyof typeof styles;

export function StatusBadge({ status }: { status: Status }) {
  const s = styles[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
