import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Property } from '@/lib/types';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const { marketing_strategy, pricing_type, price, price_upper } = await request.json();

    if (!marketing_strategy || typeof marketing_strategy !== 'string') {
      return NextResponse.json({ detail: 'Marketing strategy is required' }, { status: 400 });
    }

    const db = await getDb();

    const updateData: Record<string, unknown> = {
      marketing_strategy,
      pricing_type: pricing_type || 'offers_over'
    };

    if (price && typeof price === 'number') {
      updateData.price = price;
    }
    if (price_upper && typeof price_upper === 'number') {
      updateData.price_upper = price_upper;
    }

    const result = await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Apply marketing strategy error:', error);
    return NextResponse.json({ detail: 'Failed to apply marketing strategy' }, { status: 500 });
  }
}
