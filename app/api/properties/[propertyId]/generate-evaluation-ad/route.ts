import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://propertyval-api.azurewebsites.net';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { propertyId } = await params;

  try {
    // 1. Fetch the property from backend
    const propertyResponse = await fetch(`${BACKEND_URL}/api/properties/${propertyId}`);
    if (!propertyResponse.ok) {
      return NextResponse.json(
        { detail: 'Property not found' },
        { status: 404 }
      );
    }

    const property = await propertyResponse.json();

    if (!property.evaluation_report) {
      return NextResponse.json(
        { detail: 'Property has no evaluation report. Please evaluate the property first.' },
        { status: 400 }
      );
    }

    // 2. Generate marketing ad using OpenAI
    const openai = getOpenAI();

    const prompt = `You are a professional real estate copywriter. Based on the following property valuation report, create a compelling marketing advertisement for this property.

PROPERTY DETAILS:
- Address: ${property.location}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Car Spaces: ${property.carpark}
${property.size ? `- Land Size: ${property.size} sqm` : ''}
${property.property_type ? `- Property Type: ${property.property_type}` : ''}

VALUATION REPORT:
${property.evaluation_report}

${property.improvements_detected ? `IMPROVEMENTS DETECTED FROM PHOTOS:\n${property.improvements_detected}` : ''}

Please write a professional, engaging property advertisement that:
1. Has an attention-grabbing headline
2. Highlights the key features and selling points
3. Mentions any detected improvements or renovations
4. Creates emotional appeal for potential buyers
5. Is suitable for listing on real estate websites like realestate.com.au or Domain

Format the ad with:
- A punchy headline (1 line)
- A compelling opening paragraph
- Key features as bullet points
- A closing call-to-action

Keep the tone professional but warm, and the length around 200-300 words.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert real estate copywriter who creates compelling property advertisements that drive buyer interest.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const adContent = completion.choices[0]?.message?.content;

    if (!adContent) {
      return NextResponse.json(
        { detail: 'Failed to generate ad content' },
        { status: 500 }
      );
    }

    // 3. Save the ad to the property via backend
    const updateResponse = await fetch(`${BACKEND_URL}/api/properties/${propertyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluation_ad: adContent
      })
    });

    if (!updateResponse.ok) {
      console.error('Failed to save ad to backend, but returning ad content anyway');
    }

    return NextResponse.json({
      ad_content: adContent,
      property_id: propertyId
    });

  } catch (error) {
    console.error('[GenerateAd] Error:', error);
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Failed to generate marketing ad' },
      { status: 500 }
    );
  }
}
