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

    if (!property.evaluation_report) {
      return NextResponse.json({ detail: 'Property must be evaluated first' }, { status: 400 });
    }

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert real estate marketing copywriter. Create a compelling Facebook/social media ad based on the property evaluation. The ad should:
- Highlight the key value propositions from the evaluation
- Use persuasive, engaging language
- Include a clear call to action
- Be suitable for Facebook/Instagram advertising
- Use emojis strategically for engagement
- Be 150-250 words`
        },
        {
          role: 'user',
          content: `Create a marketing ad for this property based on its evaluation:

Location: ${property.location}
${property.beds} beds, ${property.baths} baths, ${property.carpark} car
Price: ${property.price ? '$' + property.price.toLocaleString() : 'Contact agent'}

Evaluation Report:
${property.evaluation_report.substring(0, 1500)}`
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    });

    const adContent = completion.choices[0]?.message?.content || 'Unable to generate ad';

    await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      { $set: { evaluation_ad: adContent } }
    );

    return NextResponse.json({ ad_content: adContent, success: true });
  } catch (error) {
    console.error('Generate evaluation ad error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ detail: 'Failed to generate ad: ' + errorMessage }, { status: 500 });
  }
}
