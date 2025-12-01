import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getOpenAI } from '@/lib/openai';
import { Property } from '@/lib/types';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const db = await getDb();

    const property = await db
      .collection<Property>('properties')
      .findOne({ id: propertyId }, { projection: { _id: 0 } });

    if (!property) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    const propertyDesc = `
      Location: ${property.location}
      Property Type: ${property.property_type || 'Residential'}
      Bedrooms: ${property.beds}
      Bathrooms: ${property.baths}
      Car Parks: ${property.carpark}
      Size: ${property.size ? property.size + ' sqm' : 'Not specified'}
      Price: ${property.price ? '$' + property.price.toLocaleString() : 'Contact agent'}
      Features: ${property.features || 'Modern property with great potential'}
      ${property.rp_data_report ? 'Market Data: ' + property.rp_data_report.substring(0, 500) : ''}
    `;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert Australian real estate copywriter specializing in premium property marketing. Create compelling, sophisticated property descriptions that:
- Use evocative, descriptive language that paints a picture of the lifestyle
- Highlight unique architectural features, views, and premium finishes
- Emphasize location benefits (proximity to beaches, cafes, transport, schools)
- Include specific details about room layouts, storage, and practical features
- Appeal to the target buyer demographic (professionals, families, downsizers, investors)
- Use flowing, elegant prose without bullet points
- Create a sense of exclusivity and desirability
- Write 2-3 substantial paragraphs that read like premium marketing copy
- Reference local landmarks, suburbs, and lifestyle benefits specific to the area`
        },
        {
          role: 'user',
          content: `Write a professional, sophisticated selling pitch for this Australian property. Make it read like high-end real estate marketing copy:\n${propertyDesc}`
        }
      ],
      max_tokens: 700,
      temperature: 0.7
    });

    const pitch = completion.choices[0]?.message?.content || 'Unable to generate pitch';

    await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      { $set: { pitch } }
    );

    return NextResponse.json({ pitch, success: true });
  } catch (error) {
    console.error('Generate pitch error:', error);
    return NextResponse.json({ detail: 'Failed to generate pitch' }, { status: 500 });
  }
}
