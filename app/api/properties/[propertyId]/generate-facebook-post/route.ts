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
      Agent: ${property.agent1_name || 'Your Local Agent'}
    `;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social media manager for Australian real estate. Create engaging Facebook posts that generate interest and shares. Include relevant emojis, property highlights, and a clear call to action. Format for readability with line breaks.'
        },
        {
          role: 'user',
          content: `Create an engaging Facebook post for this property listing:\n${propertyDesc}`
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    const postContent = completion.choices[0]?.message?.content || 'Unable to generate post';

    return NextResponse.json({ post_content: postContent, success: true });
  } catch (error) {
    console.error('Generate Facebook post error:', error);
    return NextResponse.json({ detail: 'Failed to generate Facebook post' }, { status: 500 });
  }
}
