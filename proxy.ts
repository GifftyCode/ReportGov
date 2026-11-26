import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Pages that need a signed-in user. Role checks (officer/admin) happen in Convex,
// where roles are stored, so they can't be bypassed from the browser.
const isProtected = createRouteMatcher(["/report(.*)", "/complaints(.*)", "/officer(.*)", "/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
