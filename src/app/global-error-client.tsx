"use client";

/**
 * Client-only body for global error UI. Loaded with ssr: false so it does not run
 * during prerender, avoiding "Cannot read properties of null (reading 'useContext')".
 */
export function GlobalErrorClient({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset?: () => void;
}>) {
  const linkStyle = {
    display: "inline-block" as const,
    padding: "0.5rem 1rem",
    background: "#000",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    textDecoration: "none" as const,
    cursor: "pointer" as const,
  };

  return (
    <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        Something went wrong
      </h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        An unexpected error occurred. Please try again.
      </p>
      {typeof reset === "function" ? (
        <button
          type="button"
          onClick={reset}
          style={linkStyle}
        >
          Try again
        </button>
      ) : (
        <a href="/" style={linkStyle}>
          Go to home
        </a>
      )}
    </div>
  );
}
