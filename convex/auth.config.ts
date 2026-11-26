import { AuthConfig } from "convex/server";

// Tells Convex to trust JWTs issued by your Clerk instance.
// Set CLERK_JWT_ISSUER_DOMAIN in the Convex dashboard (Settings > Environment Variables).
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
