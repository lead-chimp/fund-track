import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { logger } from "@/lib/logger"

export const { handlers, auth, signIn, signOut } = NextAuth({
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
          return null
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: {
              email
            }
          })

          if (!user) {
            logger.auth("Login attempt failed: User not found", undefined, { email })
            return null
          }

          if (!user.passwordHash) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
          )

          if (!isPasswordValid) {
            logger.auth("Login attempt failed: Invalid password", user.id.toString(), { email: user.email })
            return null
          }

          logger.auth("Login successful", user.id.toString(), { email: user.email })

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
      console.log("[Auth Debug] SignOut event triggered");
      // Fire and forget logging to avoid blocking the response
      const userId = ('token' in message && message.token?.sub) ? message.token.sub as string : undefined;
      setTimeout(() => {
        logger.auth("User signed out", userId);
      }, 0);
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
})
