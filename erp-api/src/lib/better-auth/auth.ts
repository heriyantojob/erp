import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer } from "better-auth/plugins";
import { db } from "../../db/setup";
import { schema } from "../../db/schema";

const trustedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // A fresh installation can log in immediately after sign-up without an email service.
    requireEmailVerification: false,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            scope: ["openid", "email", "profile"],
          },
        }
      : {},
  trustedOrigins,
  // Limits repeated authentication attempts before they reach password checks.
  rateLimit: { enabled: true, window: 60, max: 10 },
  plugins: [bearer(), admin({ defaultRole: "user", adminRoles: ["admin"] })],
});
