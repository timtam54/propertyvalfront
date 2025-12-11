import { NextRequest, NextResponse } from 'next/server';
import { Property } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-ts-gamma.vercel.app';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

interface SoldProperty {
  id: string;
  address: string;
  price: number;
  beds: number | null;
  baths: number | null;
  cars: number | null;
  land_area: number | null;
  property_type: string;
  sold_date: string;
  sold_date_raw: Date | null;
  source: string;
}

// Map property types to Homely URL filter values (plural form)
const PROPERTY_TYPE_TO_HOMELY: { [key: string]: string } = {
  'house': 'houses',
  'unit': 'units',
  'apartment': 'apartments',
  'townhouse': 'townhouses',
  'villa': 'villas',
  'land': 'land',
  'acreage': 'acreage',
  'rural': 'rural',
  'rural property': 'rural',
  'block of units': 'block-of-units',
};

function getHomelyPropertyType(propertyType: string): string {
  const normalized = propertyType.toLowerCase().trim();
  return PROPERTY_TYPE_TO_HOMELY[normalized] || normalized.replace(/\s+/g, '-');
}

/**
 * Parse location to extract suburb, state, postcode
 */
function parseLocation(location: string): { suburb: string; state: string; postcode: string | null } {
  const parts = location.split(',').map(p => p.trim());
  let suburb = '';
  let state = 'qld';
  let postcode: string | null = null;

  const postcodeMatch = location.match(/\b(\d{4})\b/);
  if (postcodeMatch) {
    postcode = postcodeMatch[1];
  }

  for (const s of ['nsw', 'vic', 'qld', 'sa', 'wa', 'tas', 'nt', 'act']) {
    const stateRegex = new RegExp(`\\b${s}\\b`, 'i');
    if (stateRegex.test(location)) {
      state = s;
      break;
    }
  }

  if (parts.length >= 2) {
    // Has comma - take the second part (suburb)
    let suburbPart = parts[1];
    suburbPart = suburbPart
      .replace(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/gi, '')
      .replace(/\b\d{4}\b/g, '')
      .trim();
    suburb = suburbPart.toLowerCase().replace(/\s+/g, '-');
  } else {
    // No comma - extract suburb by removing street number, state, and postcode
    let suburbPart = parts[0]
      .replace(/^\d+[a-zA-Z]?\s+/, '')  // Remove street number (e.g., "123 " or "45A ")
      .replace(/\b(street|st|road|rd|avenue|ave|drive|dr|court|ct|place|pl|lane|ln|crescent|cr|way|boulevard|blvd)\b.*/i, '')  // Remove street type and after
      .replace(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/gi, '')
      .replace(/\b\d{4}\b/g, '')
      .trim();
    suburb = suburbPart.toLowerCase().replace(/\s+/g, '-');
  }

  suburb = suburb.replace(/^\d+\s*-*/, '').replace(/-+$/, '').replace(/^-+/, '');

  return { suburb, state, postcode };
}

/**
 * Scrape sold properties from Homely.com.au (no caching - returns fresh data)
 * Returns both the properties and the URL that was scraped
 * Uses ScraperAPI proxy if SCRAPER_API_KEY is set (recommended for Vercel deployment)
 */
async function scrapeHomelyProperties(suburb: string, state: string, postcode: string | null, propertyType: string | null): Promise<{ properties: SoldProperty[], scrapedUrl: string, debug?: string }> {
  let targetUrl = postcode
    ? `https://www.homely.com.au/sold-properties/${suburb}-${state}-${postcode}`
    : `https://www.homely.com.au/sold-properties/${suburb}-${state}`;

  if (propertyType) {
    targetUrl += `?propertytype=${propertyType}`;
  }

  // Use ScraperAPI proxy if available (bypasses IP blocking on Vercel)
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  let fetchUrl: string;
  let fetchOptions: RequestInit;

  if (scraperApiKey) {
    // Use ScraperAPI proxy
    fetchUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}&render=false`;
    fetchOptions = {};
    console.log(`[Historic Sales] Using ScraperAPI proxy for: ${targetUrl}`);
  } else {
    // Direct fetch (works locally, may be blocked on Vercel)
    fetchUrl = targetUrl;
    fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    };
    console.log(`[Historic Sales] Direct fetch (no proxy): ${targetUrl}`);
  }

  try {
    const response = await fetch(fetchUrl, fetchOptions);

    if (!response.ok) {
      console.log(`[Historic Sales] HTTP ${response.status}`);
      return { properties: [], scrapedUrl: targetUrl, debug: `HTTP ${response.status}. ${scraperApiKey ? 'Using ScraperAPI' : 'No proxy - add SCRAPER_API_KEY to bypass Vercel IP blocking'}` };
    }

    const html = await response.text();
    console.log(`[Historic Sales] Got ${html.length} bytes`);

    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!nextDataMatch) {
      console.log('[Historic Sales] No __NEXT_DATA__ found');
      const preview = html.substring(0, 500);
      const hasBlockedMessage = html.includes('blocked') || html.includes('captcha') || html.includes('robot') || html.includes('Access Denied');
      return { properties: [], scrapedUrl: targetUrl, debug: `No __NEXT_DATA__. Blocked: ${hasBlockedMessage}. ${scraperApiKey ? 'Using ScraperAPI' : 'No proxy configured - Homely is blocking Vercel IPs. Add SCRAPER_API_KEY env var.'}. Preview: ${preview}` };
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const listings = nextData?.props?.pageProps?.ssrData?.listings || [];
    console.log(`[Historic Sales] Found ${listings.length} listings`);

    const properties: SoldProperty[] = [];

    for (const listing of listings) {
      const priceStr = listing.priceDetails?.longDescription ||
        listing.saleDetails?.soldDetails?.displayPrice?.longDescription || '';

      const cleaned = priceStr.replace(/[$,\s]/g, '');
      const priceMatch = cleaned.match(/(\d{6,})/);
      const price = priceMatch ? parseInt(priceMatch[1]) : null;

      if (price && price > 100000) {
        const soldOn = listing.saleDetails?.soldDetails?.soldOn;
        const soldDateRaw = soldOn ? new Date(soldOn) : null;
        const soldDate = soldDateRaw
          ? soldDateRaw.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Recently';

        const propType = listing.statusLabels?.propertyTypeDescription || 'House';
        const landArea = listing.features?.landArea || null;

        properties.push({
          id: crypto.randomUUID(),
          address: listing.address?.longAddress || listing.address?.streetAddress || 'Unknown',
          price,
          beds: listing.features?.bedrooms || null,
          baths: listing.features?.bathrooms || null,
          cars: listing.features?.cars || null,
          land_area: landArea,
          property_type: propType,
          sold_date: soldDate,
          sold_date_raw: soldDateRaw,
          source: 'homely.com.au'
        });
      }
    }

    console.log(`[Historic Sales] Extracted ${properties.length} valid properties`);
    return { properties, scrapedUrl: targetUrl };

  } catch (error: any) {
    console.log(`[Historic Sales] Error: ${error.message}`);
    return { properties: [], scrapedUrl: targetUrl };
  }
}

/**
 * GET - Fetch historic sales for a property's area (no local caching - fetches fresh from Homely)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const propertyId = resolvedParams.propertyId;

    // Fetch property from external backend
    console.log(`[Historic Sales] Fetching property ${propertyId} from backend...`);
    const propertyResponse = await fetch(`${BACKEND_URL}/api/properties/${propertyId}`);

    if (!propertyResponse.ok) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    const property: Property = await propertyResponse.json();
    console.log(`[Historic Sales] Got property: ${property.location}`);

    // Parse location
    const { suburb, state, postcode } = parseLocation(property.location);

    // Use the property's type to filter historic sales
    const propertyType = property.property_type ? getHomelyPropertyType(property.property_type) : null;

    console.log(`[Historic Sales] Parsed: suburb=${suburb}, state=${state}, postcode=${postcode}, propertyType=${propertyType}`);

    // Scrape fresh data from Homely (no caching)
    const { properties: scrapedProperties, scrapedUrl, debug } = await scrapeHomelyProperties(suburb, state, postcode, propertyType);
    const searchedAt = new Date().toISOString();

    // Sort by sold_date_raw descending
    const sortedProperties = [...scrapedProperties].sort((a, b) => {
      if (!a.sold_date_raw && !b.sold_date_raw) return 0;
      if (!a.sold_date_raw) return 1;
      if (!b.sold_date_raw) return -1;
      return new Date(b.sold_date_raw).getTime() - new Date(a.sold_date_raw).getTime();
    });

    return NextResponse.json({
      sales: sortedProperties.map(p => ({
        id: p.id,
        address: p.address,
        price: p.price,
        beds: p.beds,
        baths: p.baths,
        cars: p.cars,
        land_area: p.land_area,
        property_type: p.property_type,
        sold_date: p.sold_date,
        sold_date_raw: p.sold_date_raw,
        source: p.source
      })),
      suburb: suburb.replace(/-/g, ' '),
      state: state.toUpperCase(),
      postcode,
      propertyType: propertyType || 'all',
      cached: false,
      searchedAt: searchedAt,
      total: sortedProperties.length,
      scrapedUrl: scrapedUrl,
      debug: debug || null
    });

  } catch (error) {
    console.error('Historic sales error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ detail: 'Failed to fetch historic sales: ' + errorMessage }, { status: 500 });
  }
}
