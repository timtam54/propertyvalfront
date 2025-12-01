import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Property } from '@/lib/types';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const { sold_price, sale_date } = await request.json();

    if (!sold_price || typeof sold_price !== 'number' || sold_price <= 0) {
      return NextResponse.json({ detail: 'Valid sold price is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      {
        $set: {
          status: 'sold',
          sold_price,
          sale_date: sale_date || new Date().toISOString().split('T')[0]
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark as sold error:', error);
    return NextResponse.json({ detail: 'Failed to mark property as sold' }, { status: 500 });
  }
}
