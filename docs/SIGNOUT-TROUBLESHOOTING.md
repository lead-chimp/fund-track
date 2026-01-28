# NextAuth Signout "Provisional Headers" Issue - Troubleshooting Guide

## Problem
The signout endpoint at `https://fund-track.merchantfunding.com/api/auth/signout` shows "Provisional headers are shown" warning in the browser and returns no response. The request appears to never reach the server.

## Root Causes

### 1. **CORS Issues**
- NextAuth v5 requires proper CORS configuration
- The middleware was bypassing `/api/auth/` routes, but CSP headers might still interfere

### 2. **Content Security Policy (CSP)**
- The `form-action 'self'` directive might block POST requests to the auth endpoint
- Fixed by adding the production domain to form-action

### 3. **NEXTAUTH_URL Configuration**
- Must match the actual domain being accessed
- `.env.local` has `http://localhost:3000` (for development)
- `.env.production` has `https://fund-track.merchantfunding.com` (for production)

### 4. **Missing BasePath Configuration**
- NextAuth v5 needs explicit `basePath` configuration
- Added `basePath: "/api/auth"` to auth.ts

## Changes Made

### 1. `/src/lib/auth.ts`
- ✅ Added `basePath: "/api/auth"` configuration
- ✅ Added `events.signOut` callback for debugging
- ✅ Enhanced error logging

### 2. `/next.config.mjs`
- ✅ Updated CSP `form-action` to include production domain
- ✅ This allows POST requests to the signout endpoint

### 3. `/src/app/dashboard/page.tsx`
- ✅ Added enhanced error handling for signout
- ✅ Implemented fallback signout mechanism using fetch
- ✅ Added loading state during signout
- ✅ Added detailed console logging

### 4. `/src/app/api/auth/debug-signout/route.ts` (NEW)
- ✅ Created debug endpoint to test signout independently
- ✅ Provides detailed logging of request headers and session

## Testing Steps

### 1. Test the debug endpoint first:
```bash
curl -X POST https://fund-track.merchantfunding.com/api/auth/debug-signout \
  -H "Cookie: your-session-cookie" \
  -v
```

### 2. Check browser console logs:
Open DevTools → Network tab, filter for "signout"
- Look for the request status
- Check if it's pending, cancelled, or failed
- Examine request/response headers

### 3. Check server logs:
Look for these log messages:
- `[Auth Debug] SignOut event triggered`
- `[SignOut API] Request received`
- `[Middleware Debug] Processing request`

### 4. Verify environment variables:
```bash
# In production environment
echo $NEXTAUTH_URL  # Should be https://fund-track.merchantfunding.com
echo $NEXTAUTH_SECRET  # Should be set
```

## Additional Debugging

### Browser Console Commands:
```javascript
// Check current session
console.log('Session:', await fetch('/api/auth/session').then(r => r.json()));

// Check cookies
console.log('Cookies:', document.cookie);

// Test manual signout
fetch('/api/auth/signout', {
  method: 'POST',
  credentials: 'include'
}).then(r => console.log('Status:', r.status, 'OK:', r.ok));
```

### Server-side Checks:
```bash
# Check if the route handler exists
ls -la src/app/api/auth/[...nextauth]/route.ts

# Check middleware is not blocking
grep -n "api/auth" src/middleware.ts
```

## Common Solutions

### If signout still fails:

1. **Clear all cookies** and try again
2. **Disable browser extensions** that might interfere (ad blockers, privacy tools)
3. **Check SSL certificate** is valid
4. **Verify NEXTAUTH_SECRET** is the same across all environments
5. **Check for CSRF token issues** - NextAuth v5 handles this automatically, but verify tokens aren't expired

## Alternative Workaround

If the issue persists, you can implement a server-side signout:

```typescript
// Create /src/app/api/auth/force-signout/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = cookies();
  
  // Delete all session cookies
  cookieStore.getAll().forEach(cookie => {
    if (cookie.name.startsWith('next-auth') || cookie.name.startsWith('__Secure-next-auth')) {
      cookieStore.delete(cookie.name);
    }
  });
  
  return NextResponse.redirect('/auth/signin');
}
```

## References
- [NextAuth v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [NextAuth v5 Configuration](https://authjs.dev/reference/nextjs)
- [CSP and NextAuth](https://authjs.dev/guides/basics/security)
