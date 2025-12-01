import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Property } from '@/lib/types';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const { market_value } = await request.json();

    if (!market_value || typeof market_value !== 'number' || market_value <= 0) {
      return NextResponse.json({ detail: 'Valid market value is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      { $set: { price: market_value } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, price: market_value });
  } catch (error) {
    console.error('Apply valuation error:', error);
    return NextResponse.json({ detail: 'Failed to apply valuation' }, { status: 500 });
  }
}
