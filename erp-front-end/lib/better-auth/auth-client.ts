import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // No explicit remote baseURL: Better Auth uses the current Next.js origin.
  // next.config.js proxies /api/auth/* to erp-api, so login/session and ERP
  // requests use the same browser origin and the same cookies.
  credentials: "include",
});

export const { signIn, signOut, signUp, useSession } = authClient;
