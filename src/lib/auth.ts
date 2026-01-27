import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"
import { UserRole } from "@prisma/client"
import { logger } from "@/lib/logger"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
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

        try {
          console.log("[Auth Debug] Attempting to find user in DB...");
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })
          console.log("[Auth Debug] DB query complete. User found:", !!user);

          if (!user) {
            logger.auth("Login attempt failed: User not found", undefined, { email: credentials.email })
            console.log("[Auth Debug] User not found");
            return null
          }

          console.log("[Auth Debug] Verifying password...");
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
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
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
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
        logger.error("Error in JWT callback", error as Error)
        return token
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          session.user.id = token.id as string
          session.user.role = token.role as UserRole
        }
        return session
      } catch (error) {
        logger.error("Error in Session callback", error as Error)
        return session
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}