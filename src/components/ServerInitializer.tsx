import { initializeServer } from '@/lib/server-init';

/**
 * Server component that initializes server-side services
 * This component runs only on the server side
 */
export function ServerInitializer() {
  // Initialize server services
  initializeServer();
  
  // This component doesn't render anything
  return null;
}