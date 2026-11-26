"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  const links = [
    { href: "/report", label: "Report an issue", show: true },
    { href: "/complaints", label: "My complaints", show: true },
    { href: "/officer", label: "MDA inbox", show: me?.role === "officer" },
    { href: "/admin", label: "PEBEC dashboard", show: me?.role === "admin" },
  ];

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="font-bold text-primary">
          ReportGov{" "}
          <span className="font-normal text-muted-foreground">Lite</span>
        </Link>
        <Show when="signed-in">
          <nav className="flex flex-wrap gap-1">
            {links
              .filter((l) => l.show)
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm hover:bg-muted",
                    pathname.startsWith(l.href) && "bg-muted font-medium",
                  )}
                >
                  {l.label}
                </Link>
              ))}
          </nav>
        </Show>
        <div className="ml-auto flex items-center gap-3">
          {me && (
            <Badge variant="outline">
              {me.role}
              {me.mda ? ` · ${me.mda.acronym}` : ""}
            </Badge>
          )}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
