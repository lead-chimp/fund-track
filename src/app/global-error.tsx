"use client";

import { useEffect } from "react";

/**
 * Global error boundary. Renders in an isolated tree (no root layout, no providers).
 * Must not use NextError or any component that relies on React/Next context,
 * or prerender will fail with "Cannot read properties of null (reading 'useContext')".
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset?: () => void;
}>) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Global error caught:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#fafafa" }}>
        <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          {(reset ? (
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          ) : (
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                textDecoration: "none",
              }}
            >
              Go to home
            </a>
          ))}
        </div>
      </body>
    </html>
  );
}