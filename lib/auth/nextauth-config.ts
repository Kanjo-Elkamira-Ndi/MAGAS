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
      id: string;
      role: UserRole;
      status: UserStatus;
      retailerId: string | null;
      agentId: string | null;
    };
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    status?: UserStatus;
  }
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Copy .env.example to .env.local and fill in a strong random value.",
  );
}

export const authOptions: NextAuthOptions = {
  adapter: pgAdapter,
  session: { strategy: "database" },
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

        // Returned object becomes the `user` argument for the session callback.
        // The adapter itself handles session row creation; we only return shape.
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
    async session({ session, user }) {
      // Database strategy: `user` is the AdapterUser fresh from the DB.
      // Attach our custom fields so every authenticated route can read them.
      if (session.user) {
        session.user.id = user.id;

        const { rows } = await poolQueryWithScoping(user.id);
        const row = rows[0];

        session.user.role = row?.role satisfies UserRole | undefined;
        session.user.status = row?.status satisfies UserStatus | undefined;
        session.user.retailerId = row?.retailer_id ?? null;
        session.user.agentId = row?.agent_id ?? null;
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
  }>(
    `SELECT u.role, u.status,
            r.id AS retailer_id,
            da.id AS agent_id
     FROM users u
     LEFT JOIN retailers r ON r.user_id = u.id
     LEFT JOIN delivery_agents da ON da.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
}
