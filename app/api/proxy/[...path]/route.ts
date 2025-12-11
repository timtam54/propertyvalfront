import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-ts-gamma.vercel.app';

// Route segment config for larger payloads
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

/**
 * Proxy API route to forward requests to the backend
 * This avoids CORS issues when running locally
 */
async function proxyRequest(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const url = `${BACKEND_URL}/api/${path}`;

  // Get query string
  const searchParams = request.nextUrl.searchParams.toString();
  const fullUrl = searchParams ? `${url}?${searchParams}` : url;

  console.log(`[Proxy] ${request.method} ${fullUrl}`);

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Forward x-user-email header for user-specific filtering
    const userEmailHeader = request.headers.get('x-user-email');
    if (userEmailHeader) {
      headers['x-user-email'] = userEmailHeader;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: controller.signal,
    };

    // Include body for POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(fullUrl, fetchOptions);
    clearTimeout(timeoutId);

    // Get response data
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Return response with same status
    if (typeof data === 'string') {
      return new NextResponse(data, {
        status: response.status,
        headers: { 'Content-Type': contentType || 'text/plain' }
      });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error: any) {
    console.error(`[Proxy] Error:`, error.message);
    return NextResponse.json(
      { detail: 'Proxy error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteParams) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return proxyRequest(request, context);
}
