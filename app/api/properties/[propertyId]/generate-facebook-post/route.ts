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
      valuationInfo = `Estimated Value: ${priceToUse}`;
    }

    // Extract key details from RP Data
    let rpDataDetails = '';
    if (property.rp_data_report) {
      rpDataDetails = property.rp_data_report;
    }

    // 3. Generate Facebook Post using OpenAI
    const openai = getOpenAI();

    const prompt = `You are a social media expert for a real estate agency. Create an engaging organic Facebook post for this property listing.

CRITICAL INSTRUCTION: Use ONLY the exact information provided below. Do NOT invent, assume, or make up ANY details not explicitly stated.

=== PROPERTY DETAILS (USE EXACTLY AS PROVIDED) ===
- Address: ${property.location}
- Bedrooms: ${property.beds}
- Bathrooms: ${property.baths}
- Car Spaces: ${property.carpark}
${property.size ? `- Land Size: ${property.size} sqm` : ''}
${property.property_type ? `- Property Type: ${property.property_type}` : ''}

=== PRICE (CRITICAL - USE THIS EXACT PRICE) ===
${valuationInfo || 'Price: Contact Agent'}

THIS IS THE ONLY PRICE YOU MAY USE. Do not use any other price figure.

=== RP DATA PROFESSIONAL VALUATION REPORT ===
${rpDataDetails || 'Not available'}

=== PROPERTY EVALUATION REPORT ===
${property.evaluation_report || 'Not available'}

=== FEATURES (ONLY USE IF PROVIDED) ===
${property.features || 'No specific features listed - do not invent any'}

=== AGENT SELLING PITCH ===
${property.pitch || 'Not available'}

Create an engaging Facebook post that:
1. Opens with an attention-grabbing line
2. States the CORRECT price: ${priceToUse || 'Contact Agent'}
3. Lists ONLY the facts provided above (beds, baths, cars, size, location)
4. Does NOT invent features, renovations, or lifestyle benefits not mentioned in the data
5. Has a clear call-to-action
6. Includes 5-8 relevant hashtags

STRICT RULES:
- Price MUST be ${priceToUse || 'Contact Agent'} - no other price
- ONLY mention features explicitly stated in the data above
- Do NOT invent: pools, views, renovations, open plan living, outdoor areas, etc. unless explicitly mentioned
- Do NOT make assumptions about the neighborhood or lifestyle
- Keep it factual - creativity should be in the writing style, not inventing details

The post should be 150-200 words, professional but engaging.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social media manager for real estate. You MUST use ONLY the exact facts provided. Never invent details, features, or use different prices than specified. If information is not provided, do not include it.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5, // Lower temperature for more accurate/factual output
      max_tokens: 800,
    });

    const postContent = completion.choices[0]?.message?.content;

    if (!postContent) {
      return NextResponse.json(
        { detail: 'Failed to generate post content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      post_content: postContent.trim(),
      property_id: propertyId
    });

  } catch (error) {
    console.error('[GenerateFacebookPost] Error:', error);
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Failed to generate Facebook post' },
      { status: 500 }
    );
  }
}
