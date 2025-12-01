import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Property } from '@/lib/types';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const { pitch } = await request.json();

    if (!pitch || typeof pitch !== 'string') {
      return NextResponse.json({ detail: 'Pitch is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      { $set: { pitch } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, pitch });
  } catch (error) {
    console.error('Update pitch error:', error);
    return NextResponse.json({ detail: 'Failed to update pitch' }, { status: 500 });
  }
}
