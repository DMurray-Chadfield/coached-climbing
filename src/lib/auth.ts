import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

type IdentifierCredentials = {
  identifier?: string;
  password?: string;
};

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export async function authorizeWithIdentifier(credentials?: IdentifierCredentials) {
  const identifier = typeof credentials?.identifier === "string" ? normalizeIdentifier(credentials.identifier) : "";
  const password = typeof credentials?.password === "string" ? credentials.password : "";

  if (!identifier || !password) {
    return null;
  }

  let user = await prisma.user.findUnique({
    where: { username: identifier }
  });

  if (!user && identifier.includes("@")) {
    user = await prisma.user.findUnique({
      where: { email: identifier }
    });
  }

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? undefined,
    name: user.name
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        return authorizeWithIdentifier(credentials as IdentifierCredentials);
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};
