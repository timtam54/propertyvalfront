import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Property, PropertyCreate } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// GET /api/properties
export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email');
    const db = await getDb();

    // Build query - filter by user_email if provided
    const query: Record<string, unknown> = {};
    if (userEmail) {
      query.user_email = userEmail;
    }

    const properties = await db
      .collection<Property>('properties')
      .find(query, { projection: { _id: 0 } })
      .limit(1000)
      .toArray();

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Get properties error:', error);
    return NextResponse.json({ detail: 'Failed to get properties' }, { status: 500 });
  }
}

// POST /api/properties
export async function POST(request: NextRequest) {
  try {
    const propertyData = await request.json() as PropertyCreate;
    const userEmail = request.headers.get('x-user-email');

    const property: Property = {
      id: uuidv4(),
      beds: propertyData.beds,
      baths: propertyData.baths,
      carpark: propertyData.carpark,
      location: propertyData.location,
      price: propertyData.price || null,
      size: propertyData.size || null,
      property_type: propertyData.property_type || null,
      features: propertyData.features || null,
      strata_body_corps: propertyData.strata_body_corps || null,
      council_rates: propertyData.council_rates || null,
      images: propertyData.images || [],
      pitch: null,
      agent1_name: propertyData.agent1_name || null,
      agent1_phone: propertyData.agent1_phone || null,
      agent2_name: propertyData.agent2_name || null,
      agent2_phone: propertyData.agent2_phone || null,
      agent_email: propertyData.agent_email || null,
      evaluation_report: null,
      evaluation_date: null,
      improvements_detected: null,
      evaluation_ad: null,
      pricing_type: null,
      price_upper: null,
      marketing_strategy: null,
      marketing_package: null,
      marketing_cost: null,
      marketing_report: null,
      marketing_report_date: null,
      rp_data_report: null,
      rp_data_upload_date: null,
      rp_data_filename: null,
      agent_id: null,
      agent_name: null,
      agency_id: 'default_agency',
      user_email: userEmail || propertyData.user_email || null,
      created_at: new Date()
    };

    // Check document size (MongoDB has 16MB limit)
    const docString = JSON.stringify(property);
    const docSize = Buffer.byteLength(docString, 'utf8');
    const maxSize = 15 * 1024 * 1024; // 15MB to be safe

    if (docSize > maxSize) {
      const numImages = property.images.length;
      return NextResponse.json({
        detail: `Property data too large (${(docSize / 1024 / 1024).toFixed(1)}MB). Limit is 15MB. You have ${numImages} images. Please reduce to maximum 10-15 images.`
      }, { status: 413 });
    }

    const db = await getDb();
    await db.collection<Property>('properties').insertOne(property);

    return NextResponse.json(property, { status: 201 });
  } catch (error: unknown) {
    console.error('Create property error:', error);
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('DocumentTooLarge')) {
      return NextResponse.json({
        detail: 'Failed to create property: Too many images. Please reduce to maximum 10-15 images.'
      }, { status: 413 });
    }
    return NextResponse.json({ detail: 'Failed to create property' }, { status: 500 });
  }
}
