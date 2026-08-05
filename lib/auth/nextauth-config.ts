import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { DefaultSession } from "next-auth";
import { pgAdapter } from "./pg-adapter";
import { verifyPassword } from "./password";
import { getUserByEmailOrPhone } from "@/lib/db/queries/users";
import type { UserRole, UserStatus } from "@/types/db";

// Augment the NextAuth session/types to carry our role and scoping IDs.
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: UserRole;
      status?: UserStatus;
      retailerId?: string | null;
      agentId?: string | null;
      customerId?: string | null;
    };
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    status?: UserStatus;
    retailerId?: string | null;
    agentId?: string | null;
    customerId?: string | null;
  }
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Copy .env.example to .env.local and fill in a strong random value.",
  );
}

export const authOptions: NextAuthOptions = {
  adapter: pgAdapter,
  // NextAuth v4's Credentials provider is only supported with the JWT
  // session strategy (database sessions throw CALLBACK_CREDENTIALS_JWT_ERROR).
  // The `sessions` table stays in the schema (harmless; usable if OAuth or a
  // custom flow is added later), but the MVP relies on signed JWT cookies.
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password;
        if (!identifier || !password) return null;

        const user = await getUserByEmailOrPhone(identifier);
        if (!user) return null;
        if (user.status !== "active") return null;

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) return null;

        // Returned object becomes the `user` argument for the jwt callback.
        // We never rely on the adapter to persist anything for Credentials.
        return {
          id: user.id,
          email: user.email,
          // Carried in non-default fields via the type augmentation above.
          role: user.role,
          status: user.status,
        } as unknown as import("next-auth").User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Only populated on initial sign-in; the DB lookups are done once here
      // and the result rides in the JWT so `session` needs no DB round-trip.
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;

        const { rows } = await poolQueryWithScoping(user.id);
        const row = rows[0];
        token.retailerId = row?.retailer_id ?? null;
        token.agentId = row?.agent_id ?? null;
        token.customerId = row?.customer_id ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      // JWT strategy: `token` is the decoded session cookie. The session
      // object mirrors it so every authenticated route can read the fields.
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.retailerId = token.retailerId ?? null;
        session.user.agentId = token.agentId ?? null;
        session.user.customerId = token.customerId ?? null;
      }
      return session;
    },
  },
};

// Tiny helper kept here because we only need this one join for the
// session callback. lib/db/queries/users.ts could host it later if more
// callers appear.
import { pool } from "@/lib/db/pool";

async function poolQueryWithScoping(userId: string) {
  return pool.query<{
    role: UserRole;
    status: UserStatus;
    retailer_id: string | null;
    agent_id: string | null;
    customer_id: string | null;
  }>(
    `SELECT u.role, u.status,
            r.id AS retailer_id,
            da.id AS agent_id,
            c.user_id AS customer_id
     FROM users u
     LEFT JOIN retailers r ON r.user_id = u.id
     LEFT JOIN delivery_agents da ON da.user_id = u.id
     LEFT JOIN customers c ON c.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
}
