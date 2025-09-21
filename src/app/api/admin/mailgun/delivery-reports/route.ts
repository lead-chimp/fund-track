import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.SYSTEM_ADMIN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize MailGun client
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY || '',
    });

    const domain = process.env.MAILGUN_DOMAIN || '';

    if (!domain || !process.env.MAILGUN_API_KEY) {
      return NextResponse.json({
        error: 'MailGun configuration missing'
      }, { status: 500 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const event = searchParams.get('event') || undefined;
    const begin = searchParams.get('begin') || undefined;
    const end = searchParams.get('end') || undefined;

    // Build query parameters for MailGun API - use maximum limit to get all data
    const queryParams: any = {
      limit: 300, // Always use MailGun's maximum limit to get all available data
    };

    if (event) {
      queryParams.event = event;
    }

    // Convert datetime-local format to proper MailGun format
    // MailGun expects RFC2822 format or Unix timestamp
    if (begin) {
      const beginDate = new Date(begin);
      // Validate date
      if (isNaN(beginDate.getTime())) {
        return NextResponse.json({
          error: 'Invalid begin date format'
        }, { status: 400 });
      }
      // Use Unix timestamp for more reliable results
      queryParams.begin = Math.floor(beginDate.getTime() / 1000);
    }

    if (end) {
      const endDate = new Date(end);
      // Validate date
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({
          error: 'Invalid end date format'
        }, { status: 400 });
      }
      // Use Unix timestamp for more reliable results
      queryParams.end = Math.floor(endDate.getTime() / 1000);
    }

    // Validate date range (MailGun only keeps 5 days of data)
    if (queryParams.begin && queryParams.end) {
      const now = Math.floor(Date.now() / 1000);
      const fiveDaysAgo = now - (5 * 24 * 60 * 60);

      if (queryParams.begin < fiveDaysAgo) {
        return NextResponse.json({
          error: 'Begin date is older than 5 days. MailGun only retains event data for 5 days.'
        }, { status: 400 });
      }

      if (queryParams.end < queryParams.begin) {
        return NextResponse.json({
          error: 'End date must be after begin date'
        }, { status: 400 });
      }
    }

    console.log('MailGun API Query Parameters:', queryParams);

    // Fetch all available events from MailGun
    let events: any;
    try {
      console.log('Fetching all events with params:', queryParams);
      const result = await mg.events.get(domain, queryParams);
      events = result as any;
      console.log('Events fetched successfully:', {
        itemCount: events?.items?.length,
        maxLimit: 300
      });
    } catch (error) {
      console.error('Error fetching events from MailGun:', error);
      return NextResponse.json({
        error: 'Failed to fetch events from MailGun',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Validate response structure
    if (!events || typeof events !== 'object') {
      return NextResponse.json({
        error: 'Invalid response from MailGun API',
        details: 'Response is not an object'
      }, { status: 500 });
    }

    if (!Array.isArray(events.items)) {
      return NextResponse.json({
        error: 'Invalid response from MailGun API',
        details: 'Response does not contain items array'
      }, { status: 500 });
    }

    // Log some debug information
    console.log('MailGun API Response Summary:', {
      totalItems: events.items?.length,
      maxPossible: 300,
      queryParams,
      firstItemTimestamp: events.items?.[0]?.timestamp,
      lastItemTimestamp: events.items?.[events.items.length - 1]?.timestamp,
      dateRange: {
        begin: queryParams.begin ? new Date(queryParams.begin * 1000).toISOString() : 'Not specified',
        end: queryParams.end ? new Date(queryParams.end * 1000).toISOString() : 'Not specified'
      }
    });



    return NextResponse.json({
      success: true,
      data: {
        items: events.items || [],
        paging: {} // No pagination - return all available data
      },
      query: queryParams,
      debug: {
        requestTime: new Date().toISOString(),
        itemCount: events.items?.length || 0,
        maxLimit: 300,
        dateRange: {
          begin: queryParams.begin ? new Date(queryParams.begin * 1000).toISOString() : null,
          end: queryParams.end ? new Date(queryParams.end * 1000).toISOString() : null
        }
      }
    });

  } catch (error) {
    console.error('MailGun delivery reports error:', error);
    return NextResponse.json({
      error: 'Failed to fetch delivery reports',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}