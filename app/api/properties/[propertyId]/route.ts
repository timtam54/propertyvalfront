import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Property, PropertyCreate } from '@/lib/types';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

// GET /api/properties/:propertyId
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const userEmail = request.headers.get('x-user-email');

    const db = await getDb();

    // Build query
    const query: Record<string, string> = { id: propertyId };
    if (userEmail) {
      query.user_email = userEmail;
    }

    const property = await db
      .collection<Property>('properties')
      .findOne(query, { projection: { _id: 0 } });

    if (!property) {
      // Check if property exists but belongs to different user
      const existingProp = await db
        .collection<Property>('properties')
        .findOne({ id: propertyId }, { projection: { _id: 0 } });

      if (existingProp) {
        return NextResponse.json({ detail: 'Access denied: You can only view your own properties' }, { status: 403 });
      }
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error('Get property error:', error);
    return NextResponse.json({ detail: 'Failed to get property' }, { status: 500 });
  }
}

// PUT /api/properties/:propertyId
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const userEmail = request.headers.get('x-user-email');
    const updateData = await request.json() as PropertyCreate;

    const db = await getDb();

    // Build query
    const query: Record<string, string> = { id: propertyId };
    if (userEmail) {
      query.user_email = userEmail;
    }

    const property = await db
      .collection<Property>('properties')
      .findOne(query, { projection: { _id: 0 } });

    if (!property) {
      const existingProp = await db
        .collection<Property>('properties')
        .findOne({ id: propertyId }, { projection: { _id: 0 } });

      if (existingProp) {
        return NextResponse.json({ detail: 'Access denied: You can only update your own properties' }, { status: 403 });
      }
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    // Check document size
    const docString = JSON.stringify(updateData);
    const docSize = Buffer.byteLength(docString, 'utf8');
    const maxSize = 15 * 1024 * 1024;

    if (docSize > maxSize) {
      const numImages = updateData.images?.length || 0;
      return NextResponse.json({
        detail: `Property data too large (${(docSize / 1024 / 1024).toFixed(1)}MB). Limit is 15MB. You have ${numImages} images. Please reduce to maximum 10-15 images.`
      }, { status: 413 });
    }

    await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      { $set: updateData }
    );

    const updatedProperty = await db
      .collection<Property>('properties')
      .findOne({ id: propertyId }, { projection: { _id: 0 } });

    return NextResponse.json(updatedProperty);
  } catch (error: unknown) {
    console.error('Update property error:', error);
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('DocumentTooLarge')) {
      return NextResponse.json({
        detail: 'Property update failed: Too many images. Please reduce to maximum 10-15 images.'
      }, { status: 413 });
    }
    return NextResponse.json({ detail: 'Failed to update property' }, { status: 500 });
  }
}

// DELETE /api/properties/:propertyId
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const userEmail = request.headers.get('x-user-email');

    const db = await getDb();

    // Build query
    const query: Record<string, string> = { id: propertyId };
    if (userEmail) {
      query.user_email = userEmail;
    }

    const property = await db
      .collection<Property>('properties')
      .findOne(query, { projection: { _id: 0 } });

    if (!property) {
      const existingProp = await db
        .collection<Property>('properties')
        .findOne({ id: propertyId }, { projection: { _id: 0 } });

      if (existingProp) {
        return NextResponse.json({ detail: 'Access denied: You can only delete your own properties' }, { status: 403 });
      }
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    const result = await db.collection<Property>('properties').deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    return NextResponse.json({ detail: 'Failed to delete property' }, { status: 500 });
  }
}
