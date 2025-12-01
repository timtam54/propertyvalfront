import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Property } from '@/lib/types';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const { evaluation_report } = await request.json();

    if (!evaluation_report || typeof evaluation_report !== 'string') {
      return NextResponse.json({ detail: 'Evaluation report is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      { $set: { evaluation_report } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update evaluation report error:', error);
    return NextResponse.json({ detail: 'Failed to update evaluation report' }, { status: 500 });
  }
}
