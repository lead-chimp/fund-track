import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { logger } from "@/lib/logger"

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth",
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("[Auth Debug] Authorize called with email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          logger.auth("Login attempt failed: Missing credentials")
          console.log("[Auth Debug] Missing credentials");
          return null
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          console.log("[Auth Debug] Attempting to find user in DB...");
          const user = await prisma.user.findUnique({
            where: {
              email
            }
          })
          console.log("[Auth Debug] DB query complete. User found:", !!user);

          if (!user) {
            logger.auth("Login attempt failed: User not found", undefined, { email })
            console.log("[Auth Debug] User not found");
            return null
          }

          console.log("[Auth Debug] Verifying password...");
          if (!user.passwordHash) {
            console.log("[Auth Debug] User has no password hash");
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
          )
          console.log("[Auth Debug] Password verification result:", isPasswordValid);

          if (!isPasswordValid) {
            logger.auth("Login attempt failed: Invalid password", user.id.toString(), { email: user.email })
            console.log("[Auth Debug] Invalid password");
            return null
          }

          logger.auth("Login successful", user.id.toString(), { email: user.email })
          console.log("[Auth Debug] Login successful, returning user object");

          return {
            id: user.id.toString(),
            email: user.email,
            role: user.role,
          }
        } catch (error) {
          console.error("[Auth Debug] Unexpected error in authorize:", error);
          logger.error("Unexpected error in authorize callback", error as Error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      try {
        if (trigger === "update" && session) {
          return { ...token, ...session.user };
        }

        if (user) {
          token.id = user.id
          token.role = user.role
        }
        return token
      } catch (error) {
        console.error("[Auth Debug] Error in JWT callback:", error);
        return token
      }
    },
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id as string
          session.user.role = token.role as UserRole
        }
        return session
      } catch (error) {
        console.error("[Auth Debug] Error in Session callback:", error);
        return session
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  events: {
    async signOut(message) {
      console.log("[Auth Debug] SignOut event triggered:", message);
      const userId = ('token' in message && message.token?.sub) ? message.token.sub as string : undefined;
      logger.auth("User signed out", userId);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})
