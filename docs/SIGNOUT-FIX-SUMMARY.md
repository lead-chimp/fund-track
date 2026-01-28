# NextAuth Signout Fix - Summary

## Problem
The `/api/auth/signout` endpoint was showing "Provisional headers are shown" in Chrome DevTools and returning no response. The request appeared to never reach the server.

## Root Cause Analysis
The issue was likely caused by a combination of:

1. **Missing `basePath` configuration** in NextAuth v5
2. **Restrictive CSP (Content Security Policy)** headers blocking the POST request
3. **Potential CSRF token handling issues** (though middleware was bypassing auth routes)

## Solutions Implemented

### 1. Enhanced Auth Configuration (`/src/lib/auth.ts`)
- ✅ Added `basePath: "/api/auth"` to ensure NextAuth v5 properly handles the auth routes
- ✅ Added `events.signOut` callback for server-side logging when signout occurs
- ✅ Enhanced error handling with detailed console logs

### 2. Updated CSP Headers (`/next.config.mjs`)
- ✅ Modified `form-action` directive from `'self'` to `'self' https://fund-track.merchantfunding.com`
- ✅ This explicitly allows POST requests to the production auth endpoint

### 3. Enhanced Client-Side Signout (`/src/app/dashboard/page.tsx`)
- ✅ Added robust error handling with try/catch blocks
- ✅ Implemented fallback signout mechanism using direct `fetch()` if NextAuth's `signOut()` fails
- ✅ Added loading state (`isSigningOut`) to prevent double-clicks
- ✅ Added detailed client-side logging for debugging
- ✅ User-friendly error messages if signout fails

### 4. Debug Tools Created

#### a) Debug Signout Endpoint (`/src/app/api/auth/debug-signout/route.ts`)
A dedicated endpoint for testing signout independently with detailed logging:
```bash
curl -X POST https://fund-track.merchantfunding.com/api/auth/debug-signout \
  -H "Cookie: your-session-cookie" -v
```

#### b) Client-Side Diagnostic Tool (`/src/lib/test-signout.ts`)
Run comprehensive diagnostics from browser console:
```javascript
window.testSignout()
```

This will check:
- Current session status
- Auth cookies
- Signout endpoint accessibility
- CSRF tokens
- Network configuration
- Service worker interceptors

## Testing Instructions

### Option 1: Test the enhanced signout (Recommended)
1. Deploy the changes to production
2. Login to the application
3. Click the "Sign Out" button
4. Check browser console for detailed logs
5. Verify successful redirect to `/auth/signin`

### Option 2: Use the diagnostic tool
1. Open browser DevTools console
2. Run: `window.testSignout()`
3. Review the diagnostic output
4. Share any errors with the development team

### Option 3: Test the debug endpoint
```bash
# Get your session cookie from browser DevTools
# Then run:
curl -X POST https://fund-track.merchantfunding.com/api/auth/debug-signout \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE" \
  -v
```

## What to Check if Issue Persists

1. **Server Logs**: Look for these messages:
   - `[Auth Debug] SignOut event triggered`
   - `[Client] Initiating signout...`
   - `[Middleware Debug] Processing request`

2. **Browser Console**: Check for:
   - Network errors (CORS, CSP violations)
   - JavaScript errors during signout
   - Response status codes

3. **Network Tab**: Filter by "signout" and check:
   - Request status (pending/cancelled/failed)
   - Request headers (especially cookies)
   - Response headers

4. **Environment Variables**: Verify in production:
   ```bash
   NEXTAUTH_URL=https://fund-track.merchantfunding.com
   NEXTAUTH_SECRET=<should be set>
   ```

## Fallback Workaround
If the issue still occurs, the enhanced signout handler will:
1. First try the standard NextAuth `signOut()`
2. If that fails, attempt a manual `fetch()` to `/api/auth/signout`
3. If both fail, show an error message to the user
4. Log all failures to the console for debugging

## Files Changed
1. `/src/lib/auth.ts` - Enhanced configuration
2. `/next.config.mjs` - Updated CSP headers
3. `/src/app/dashboard/page.tsx` - Enhanced signout handler
4. `/src/app/api/auth/debug-signout/route.ts` - NEW debug endpoint
5. `/src/lib/test-signout.ts` - NEW diagnostic tool
6. `/src/lib/auth-debug.ts` - NEW debug utilities
7. `/docs/SIGNOUT-TROUBLESHOOTING.md` - NEW troubleshooting guide

## Next Steps
1. Deploy these changes to production
2. Test the signout functionality
3. Run the diagnostic tool if issues persist
4. Review server logs for any errors
5. Report back with findings

## Additional Notes
- The middleware already bypasses `/api/auth/*` routes, so that's not causing the issue
- NEXTAUTH_URL is correctly set in `.env.production`
- The changes are backward compatible and won't affect existing functionality
