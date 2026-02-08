import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ConditionalSessionProvider } from "@/components/auth/ConditionalSessionProvider";
import { ServerInitializer } from "@/components/ServerInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Fund Track App",
  description: "Internal lead management system for Fund Track",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} font-sans`}>
        <ServerInitializer key="server-initializer" />
        <ErrorBoundary key="error-boundary">
          <ConditionalSessionProvider>{children}</ConditionalSessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
