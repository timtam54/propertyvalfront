import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://propertyval-api.azurewebsites.net';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

/**
 * POST - Recalculate property valuation with selected comparables
 * This endpoint filters the existing comparables to the selected ones and re-runs evaluation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const propertyId = resolvedParams.propertyId;

    // Get selected comparable IDs from request body
    const body = await request.json();
    const selectedComparableIds: string[] = body.selected_comparable_ids || [];

    if (selectedComparableIds.length === 0) {
      return NextResponse.json(
        { detail: 'No comparables selected. Please select at least one comparable property.' },
        { status: 400 }
      );
    }

    // Fetch the property to get existing comparables data
    console.log(`[Recalculate] Fetching property ${propertyId}...`);
    const propertyResponse = await fetch(`${BACKEND_URL}/api/properties/${propertyId}`);

    if (!propertyResponse.ok) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    const property = await propertyResponse.json();

    // Get existing comparables from the property
    const existingComparables = property.comparables_data?.comparable_sold || [];

    if (existingComparables.length === 0) {
      return NextResponse.json(
        { detail: 'No comparable data found. Please run an evaluation first.' },
        { status: 400 }
      );
    }

    // Filter to only selected comparables
    const selectedComparables = existingComparables.filter((c: any) =>
      selectedComparableIds.includes(c.id)
    );

    if (selectedComparables.length === 0) {
      return NextResponse.json(
        { detail: 'None of the selected comparable IDs match existing comparables.' },
        { status: 400 }
      );
    }

    console.log(`[Recalculate] Using ${selectedComparables.length} of ${existingComparables.length} comparables`);

    // Transform comparables to the format expected by evaluate endpoint
    const historicSales = selectedComparables.map((c: any) => ({
      id: c.id,
      address: c.address,
      price: c.price,
      beds: c.beds,
      baths: c.baths,
      cars: c.carpark,
      land_area: c.land_area,
      property_type: c.property_type,
      sold_date: c.sold_date,
      sold_date_raw: c.sold_date_raw,
      source: c.source,
      similarity: c.similarity_score,
      latitude: c.latitude,
      longitude: c.longitude,
      distance: c.distance_km,
    }));

    // Call the evaluate endpoint with the filtered comparables
    const evaluateUrl = `${request.nextUrl.origin}/api/properties/${propertyId}/evaluate`;
    console.log(`[Recalculate] Calling evaluate endpoint: ${evaluateUrl}`);

    const evaluateResponse = await fetch(evaluateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historicSales,
        evaluationSource: 'homely'
      }),
    });

    if (!evaluateResponse.ok) {
      const errorData = await evaluateResponse.json();
      return NextResponse.json(
        { detail: errorData.detail || 'Failed to recalculate valuation' },
        { status: evaluateResponse.status }
      );
    }

    const evaluationResult = await evaluateResponse.json();

    // Return the evaluation result
    return NextResponse.json({
      ...evaluationResult,
      selected_comparables: selectedComparableIds,
    });

  } catch (error) {
    console.error('Recalculate error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { detail: 'Failed to recalculate: ' + errorMessage },
      { status: 500 }
    );
  }
}
