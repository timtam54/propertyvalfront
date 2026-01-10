import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://propertyval-api.azurewebsites.net';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

/**
 * POST - Recalculate property valuation with selected comparables
 * Uses all_comparables passed from frontend (from cache) to avoid relying on stored data
 * which may have been filtered from a previous recalculation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const propertyId = resolvedParams.propertyId;

    // Get selected comparable IDs and full comparables list from request body
    const body = await request.json();
    const selectedComparableIds: string[] = body.selected_comparable_ids || [];
    const allComparables: any[] = body.all_comparables || [];

    if (selectedComparableIds.length === 0) {
      return NextResponse.json(
        { detail: 'No comparables selected. Please select at least one comparable property.' },
        { status: 400 }
      );
    }

    // Fetch the property (needed for property details, not comparables)
    console.log(`[Recalculate] Fetching property ${propertyId}...`);
    const propertyResponse = await fetch(`${BACKEND_URL}/api/properties/${propertyId}`);

    if (!propertyResponse.ok) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    const property = await propertyResponse.json();

    // Use all_comparables from frontend if provided, otherwise fall back to stored data
    let sourceComparables = allComparables;
    if (sourceComparables.length === 0) {
      // Fallback to stored comparables if frontend didn't send the full list
      sourceComparables = property.comparables_data?.comparable_sold || [];
      console.log(`[Recalculate] Using stored comparables (${sourceComparables.length}) as fallback`);
    } else {
      console.log(`[Recalculate] Using ${sourceComparables.length} comparables from frontend cache`);
    }

    if (sourceComparables.length === 0) {
      return NextResponse.json(
        { detail: 'No comparable data found. Please run an evaluation first.' },
        { status: 400 }
      );
    }

    // Filter to only selected comparables
    const selectedComparables = sourceComparables.filter((c: any) =>
      selectedComparableIds.includes(c.id)
    );

    if (selectedComparables.length === 0) {
      return NextResponse.json(
        { detail: 'None of the selected comparable IDs match available comparables.' },
        { status: 400 }
      );
    }

    console.log(`[Recalculate] Using ${selectedComparables.length} of ${sourceComparables.length} comparables`);

    // Transform comparables to the format expected by evaluate endpoint
    // Handle both formats: from frontend cache (cars, land_area, similarity, distance)
    // and from stored data (carpark, land_area, similarity_score, distance_km)
    const historicSales = selectedComparables.map((c: any) => ({
      id: c.id,
      address: c.address,
      price: c.price,
      beds: c.beds,
      baths: c.baths,
      cars: c.cars ?? c.carpark,
      land_area: c.land_area,
      property_type: c.property_type,
      sold_date: c.sold_date,
      sold_date_raw: c.sold_date_raw,
      source: c.source || 'homely.com.au',
      similarity: c.similarity ?? c.similarity_score,
      latitude: c.latitude,
      longitude: c.longitude,
      distance: c.distance ?? c.distance_km,
    }));

    // Call the evaluate endpoint with the filtered comparables
    // In production (Azure), request.nextUrl.origin can be unreliable (returns localhost)
    // Priority: 1) NEXT_PUBLIC_APP_URL env var, 2) host header, 3) hardcoded production URL
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';

    let baseUrl: string;
    if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else if (host && !host.includes('localhost')) {
      baseUrl = `${protocol}://${host}`;
    } else {
      // Hardcoded fallback for production
      baseUrl = 'https://propertyeval.com.au';
    }

    const evaluateUrl = `${baseUrl}/api/properties/${propertyId}/evaluate`;
    console.log(`[Recalculate] Calling evaluate endpoint: ${evaluateUrl}`);

    let evaluateResponse;
    try {
      evaluateResponse = await fetch(evaluateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward headers to help with internal routing
          'x-forwarded-host': host || '',
          'x-forwarded-proto': protocol,
        },
        body: JSON.stringify({
          historicSales,
          evaluationSource: 'homely'
        }),
      });
    } catch (fetchError) {
      console.error(`[Recalculate] Fetch to evaluate endpoint failed:`, fetchError);
      console.error(`[Recalculate] Attempted URL: ${evaluateUrl}`);
      console.error(`[Recalculate] Host header: ${host}`);
      console.error(`[Recalculate] Protocol: ${protocol}`);
      throw new Error(`Failed to reach evaluate endpoint at ${evaluateUrl}`);
    }

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
