import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ConvexError } from "convex/values";

/** Merge Tailwind classes, resolving conflicts (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Friendly message from a Convex error (ConvexError carries our own text). */
export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) return String(err.data);
  if (err instanceof Error) return "Something went wrong. Please try again.";
  return "Something went wrong.";
}

export function formatDate(ms: number) {
  return new Date(ms).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
