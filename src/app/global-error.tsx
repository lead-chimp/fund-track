"use client";

/**
 * Skip static prerender for this route (Next.js 16 build fix for useContext null).
 * Route segment config is read at module level.
 */
export const dynamic = "force-dynamic";

/**
 * Global error boundary. Renders in an isolated tree (no root layout, no providers).
 * Must not use hooks or components that rely on React/Next context,
 * or prerender will fail with "Cannot read properties of null (reading 'useContext')".
 */
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
        style={{ margin: 0, fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#fafafa" }}
        data-error-digest={error.digest}
      >
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