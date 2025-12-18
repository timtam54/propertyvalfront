import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-ts-gamma.vercel.app';

/**
 * GET /api/historic-sales-weights
 * Get active weights configuration
 */
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/historic-sales-weights`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching historic sales weights:', error);
    return NextResponse.json(
      { detail: 'Failed to fetch weights' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/historic-sales-weights
 * Create new weights configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/historic-sales-weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating historic sales weights:', error);
    return NextResponse.json(
      { detail: 'Failed to create weights' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/historic-sales-weights
 * Update existing weights - requires id in body
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { detail: 'Missing id in request body' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/historic-sales-weights/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating historic sales weights:', error);
    return NextResponse.json(
      { detail: 'Failed to update weights' },
      { status: 500 }
    );
  }
}
