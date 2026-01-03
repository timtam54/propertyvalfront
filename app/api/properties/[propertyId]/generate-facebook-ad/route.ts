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

    // 2. Use property.price as the primary source for estimated value
    let valuationInfo = '';
    let priceToUse = '';

    // Use property.price as the primary source for estimated value
    if (property.price) {
      priceToUse = `$${property.price.toLocaleString()}`;
      valuationInfo = `IMPORTANT - USE THIS ESTIMATED VALUE: ${priceToUse}`;
    }

    // 3. Generate Facebook Ad using OpenAI
    const openai = getOpenAI();

    const prompt = `You are a Facebook Ads expert specializing in real estate marketing. Create a high-converting Facebook ad for this property listing.

CRITICAL: Use ONLY the information provided below. Do NOT invent or assume any details.

=== PROPERTY DETAILS (USE EXACTLY AS PROVIDED) ===
- Address: ${property.location}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Car Spaces: ${property.carpark}
${property.size ? `- Land/Floor Size: ${property.size} sqm` : ''}
${property.property_type ? `- Property Type: ${property.property_type}` : ''}

=== PRICING (CRITICAL - USE THIS EXACT PRICE) ===
${valuationInfo || 'Price: Contact Agent'}
DO NOT use any other price. The valuation above is the correct price to advertise.

=== FEATURES ===
${property.features || 'No specific features listed'}

=== RP DATA VALUATION REPORT ===
${property.rp_data_report ? property.rp_data_report.substring(0, 2000) : 'Not available'}

=== PROPERTY EVALUATION ===
${property.evaluation_report ? property.evaluation_report.substring(0, 2000) : 'Not available'}

=== AGENT SELLING PITCH ===
${property.pitch ? property.pitch.substring(0, 1000) : 'Not available'}

Create a Facebook Ad with the following components:

1. PRIMARY TEXT (125 characters max - the main ad copy above the image)
   - Must include the correct price: ${priceToUse || 'Contact Agent'}

2. HEADLINE (40 characters max - appears below image, bold)

3. DESCRIPTION (30 characters max - appears below headline)

4. CALL TO ACTION (choose: LEARN_MORE, CONTACT_US, GET_QUOTE, BOOK_NOW)

IMPORTANT RULES:
- Use ONLY facts from the data above
- Price MUST be ${priceToUse || 'Contact Agent'} - do not use any other price
- Do not invent features, renovations, or details not mentioned
- Keep it factual and compelling

Respond in this exact JSON format only:
{
  "primary_text": "Your primary text here with correct price",
  "headline": "Your headline here",
  "description": "Your description here",
  "call_to_action": "LEARN_MORE"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Facebook Ads copywriter for real estate. You MUST use only the exact information provided - never invent details or use different prices. Always respond with valid JSON only, no markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5, // Lower temperature for more factual output
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json(
        { detail: 'Failed to generate ad content' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let adCopy;
    try {
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      adCopy = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[GenerateFacebookAd] Failed to parse response:', responseText);
      return NextResponse.json(
        { detail: 'Failed to parse ad content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ad_copy: adCopy,
      property_id: propertyId
    });

  } catch (error) {
    console.error('[GenerateFacebookAd] Error:', error);
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Failed to generate Facebook ad' },
      { status: 500 }
    );
  }
}
