"use client";

import { ReactNode } from "react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Role = "citizen" | "officer" | "admin";

/**
 * Only renders children once Convex has the user's token, so queries never run signed-out.
 * If `roles` is given, also checks the role stored in Convex (the real check is on the server).
 */
export function RequireSignIn({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  return (
    <>
      <AuthLoading>
        <p className="p-8 text-center text-muted-foreground">Loading...</p>
      </AuthLoading>
      <Unauthenticated>
        <Card className="mx-auto mt-10 max-w-md text-center">
          <CardHeader>
            <CardTitle>Please sign in</CardTitle>
            <CardDescription>You need an account to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </CardContent>
        </Card>
      </Unauthenticated>
      <Authenticated>{roles ? <RoleGate roles={roles}>{children}</RoleGate> : children}</Authenticated>
    </>
  );
}

function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const me = useQuery(api.users.me);
  if (me === undefined) return <p className="p-8 text-center text-muted-foreground">Loading...</p>;
  if (!me || !roles.includes(me.role)) {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <CardHeader>
          <CardTitle>Not authorised</CardTitle>
          <CardDescription>
            This page is for {roles.join(" / ")} accounts. Your role is {me?.role ?? "unknown"}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return <>{children}</>;
}
