import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to validate cron job requests
 * This can be used to secure cron endpoints
 */
export function validateCronRequest(request: NextRequest): boolean {
    // Option 1: Check for a secret header
    const cronSecret = request.headers.get('X-Cron-Secret');
    const expectedSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, validate it
    if (expectedSecret && expectedSecret !== '') {
        return cronSecret === expectedSecret;
    }

    // Option 2: Check if request is from localhost (for development)
    const host = request.headers.get('host');
    if (host?.startsWith('localhost') || host?.startsWith('127.0.0.1')) {
        return true;
    }

    // Option 3: Check for specific IP addresses (add your server IPs)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const allowedIps = process.env.ALLOWED_CRON_IPS?.split(',') || [];

    if (allowedIps.length > 0) {
        const requestIp = forwardedFor?.split(',')[0] || realIp;
        if (requestIp && allowedIps.includes(requestIp.trim())) {
            return true;
        }
    }

    // If no security is configured, allow all requests (not recommended for production)
    if (!expectedSecret && allowedIps.length === 0) {
        console.warn('⚠️  No cron security configured. Set CRON_SECRET or ALLOWED_CRON_IPS environment variables.');
        return true;
    }

    return false;
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: 'Unauthorized',
            message: 'Invalid or missing authentication credentials'
        },
        { status: 401 }
    );
}
