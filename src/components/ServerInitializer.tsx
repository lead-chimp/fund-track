import { initializeServer } from "@/lib/server-init";

/**
 * Server component that initializes server-side services
 * This component runs only on the server side
 */
export function ServerInitializer() {
  // Add logging to see if this component is executing
  console.log(
    "🔄 ServerInitializer component executing at:",
    new Date().toISOString()
  );

  // Initialize server services
  initializeServer();

  // This component doesn't render anything
  return null;
}
