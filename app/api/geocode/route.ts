import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

/**
 * GET /api/geocode?address=...
 * Geocode an address using Google Maps API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Call Google Geocoding API
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&region=au`;

    console.log(`[Geocode] Fetching coordinates for: ${address}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    if (data.status !== 'OK') {
      console.error(`[Geocode] API error: ${data.status}`, data.error_message);
      return NextResponse.json(
        { error: `Geocoding failed: ${data.status}` },
        { status: 500 }
      );
    }

    const result = data.results[0];
    const location = result.geometry.location;

    const geocodeResult: GeocodeResult = {
      latitude: location.lat,
      longitude: location.lng,
      formatted_address: result.formatted_address,
    };

    console.log(`[Geocode] Found: ${geocodeResult.formatted_address} (${geocodeResult.latitude}, ${geocodeResult.longitude})`);

    return NextResponse.json(geocodeResult);

  } catch (error) {
    console.error('Geocode error:', error);
    const message = error instanceof Error ? error.message : 'Geocoding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
