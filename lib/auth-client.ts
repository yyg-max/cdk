import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://test.chenyme.com",
  plugins: [
    genericOAuthClient()
  ]
});

export const { signIn, signUp, signOut, useSession } = authClient;