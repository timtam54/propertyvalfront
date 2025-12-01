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
      Features: ${property.features || 'Modern property'}
    `;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Facebook ads copywriter for Australian real estate. Create compelling ad copy that drives clicks and inquiries. Return a JSON object with: headline (max 40 chars), primary_text (engaging hook, max 125 chars), description (key benefits, max 30 chars), call_to_action (one of: LEARN_MORE, BOOK_NOW, CONTACT_US, GET_QUOTE)'
        },
        {
          role: 'user',
          content: `Create Facebook ad copy for this property:\n${propertyDesc}\n\nReturn only valid JSON.`
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    let adCopy;
    try {
      const content = completion.choices[0]?.message?.content || '{}';
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      adCopy = JSON.parse(cleanedContent);
    } catch {
      adCopy = {
        headline: `${property.beds} Bed Home in ${property.location.split(',')[0]}`,
        primary_text: `Don't miss this stunning ${property.beds} bedroom property! Perfect for families.`,
        description: 'Inquire today',
        call_to_action: 'LEARN_MORE'
      };
    }

    return NextResponse.json({ ad_copy: adCopy, success: true });
  } catch (error) {
    console.error('Generate Facebook ad error:', error);
    return NextResponse.json({ detail: 'Failed to generate Facebook ad' }, { status: 500 });
  }
}
