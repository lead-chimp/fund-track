"use client";

/**
 * Global error boundary. Renders in an isolated tree (no root layout, no providers).
 * Loads the actual UI with dynamic(..., { ssr: false }) so prerender only runs
 * static HTML and avoids "Cannot read properties of null (reading 'useContext')".
 */
import dynamic from "next/dynamic";

const GlobalErrorClient = dynamic(
  () =>
    import("./global-error-client").then((module) => ({
      default: module.GlobalErrorClient,
    })),
  {
    ssr: false,
    loading: () => (
      <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Something went wrong
        </h1>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          An unexpected error occurred. Please try again.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "0.5rem 1rem",
            background: "#000",
            color: "#fff",
            borderRadius: "4px",
            textDecoration: "none",
          }}
        >
          Go to home
        </a>
      </div>
    ),
  }
);

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset?: () => void;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          background: "#fafafa",
        }}
        data-error-digest={error.digest}
      >
        <GlobalErrorClient error={error} reset={reset} />
      </body>
    </html>
  );
}
