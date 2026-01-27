export const PUBLIC_ROUTES = [
  "/api/health",
  "/auth/",
  "/api/auth/",
  "/application/",
  "/api/intake/",
];

export const ADMIN_ROUTES = [
  "/admin",
];

export const SYSTEM_ADMIN_ROUTES = [
  "/api/dev",
  "/dev",
];

export const PROTECTED_ROUTES = [
  "/dashboard",
  "/api",
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export function isSystemAdminRoute(pathname: string): boolean {
  return SYSTEM_ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

export function isProtectedRoute(pathname: string): boolean {
  // Exclude public routes first
  if (isPublicRoute(pathname)) {
    return false;
  }
  
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}
