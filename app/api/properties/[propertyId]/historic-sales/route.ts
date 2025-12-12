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
  latitude: number | null;
  longitude: number | null;
  homely_url: string | null;
  source_suburb?: string; // The suburb this sale was found in
  is_neighbouring?: boolean; // Whether this is from a neighbouring suburb search
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Geocode an address using Google Maps API
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_API_KEY || !address) return null;

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&region=au`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results[0]) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
  } catch (error) {
    console.log(`[Geocode] Error for ${address}:`, error);
  }
  return null;
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
    fetchUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}&render=false&country_code=au`;
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
        // Try multiple possible field names for land area
        const landArea = listing.features?.landArea ||
                         listing.features?.landSize ||
                         listing.features?.land ||
                         listing.landSize ||
                         listing.propertyDetails?.landArea ||
                         listing.propertyDetails?.landSize ||
                         null;

        // Try to get coordinates from Homely data
        const lat = listing.address?.coordinate?.lat ||
                    listing.address?.latitude ||
                    listing.coordinate?.lat ||
                    listing.latitude ||
                    null;
        const lng = listing.address?.coordinate?.lon ||
                    listing.address?.coordinate?.lng ||
                    listing.address?.longitude ||
                    listing.coordinate?.lon ||
                    listing.coordinate?.lng ||
                    listing.longitude ||
                    null;

        // Build Homely URL from listing data
        // Homely provides: canonicalUri="/homes/3-6-the-esplanade-north-ward-qld-4810/12420942"
        // Or we can construct from: uri="3-6-the-esplanade-north-ward-qld-4810" and id=12420942
        let homelyUrl: string | null = null;

        // Best option: use canonicalUri which has the full path
        if (listing.canonicalUri) {
          homelyUrl = `https://www.homely.com.au${listing.canonicalUri}`;
        }

        // Fallback: construct from uri (slug) and id
        if (!homelyUrl && listing.uri && listing.id) {
          homelyUrl = `https://www.homely.com.au/homes/${listing.uri}/${listing.id}`;
        }

        // Log first listing for debugging
        if (properties.length === 0) {
          console.log(`[Historic Sales] First listing - id: ${listing.id}, uri: ${listing.uri}, canonicalUri: ${listing.canonicalUri}`);
          console.log(`[Historic Sales] Generated homelyUrl: ${homelyUrl}`);
        }

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
          source: 'homely.com.au',
          latitude: lat,
          longitude: lng,
          homely_url: homelyUrl
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
 * Check backend cache for historic sales data (cached for 7 days)
 */
async function checkCache(suburb: string, state: string, postcode: string | null, propertyType: string | null): Promise<any | null> {
  try {
    const params = new URLSearchParams({
      suburb: suburb,
      state: state,
      ...(postcode && { postcode }),
      ...(propertyType && { propertyType })
    });

    const response = await fetch(`${BACKEND_URL}/api/historic-sales-cache?${params}`);
    if (!response.ok) {
      console.log(`[Historic Sales] Cache check failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.cached) {
      console.log(`[Historic Sales] Cache HIT: ${data.cache_key}`);
      return data;
    }

    console.log(`[Historic Sales] Cache MISS: ${data.cache_key}`);
    return null;
  } catch (error) {
    console.log(`[Historic Sales] Cache check error: ${error}`);
    return null;
  }
}

/**
 * Store scraped results in backend cache
 */
async function storeInCache(suburb: string, state: string, postcode: string | null, propertyType: string | null, sales: SoldProperty[], scrapedUrl: string): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/historic-sales-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suburb,
        state,
        postcode,
        propertyType,
        sales,
        scrapedUrl
      })
    });

    if (response.ok) {
      console.log(`[Historic Sales] Stored ${sales.length} properties in cache`);
    } else {
      console.log(`[Historic Sales] Failed to store in cache: ${response.status}`);
    }
  } catch (error) {
    console.log(`[Historic Sales] Cache store error: ${error}`);
  }
}

/**
 * Helper to fetch sales for a suburb (from cache or scrape)
 */
async function fetchSuburbSales(
  suburb: string,
  state: string,
  postcode: string | null,
  propertyType: string | null,
  sourceSuburb: string,
  isNeighbouring: boolean
): Promise<{ sales: SoldProperty[], scrapedUrl: string, cached: boolean, debug?: string | null }> {
  // Check cache first
  const cachedData = await checkCache(suburb, state, postcode, propertyType);
  if (cachedData) {
    const cachedSales = (cachedData.sales || []).map((p: any) => ({
      ...p,
      source_suburb: sourceSuburb,
      is_neighbouring: isNeighbouring
    }));

    // Geocode if needed
    const propertiesToGeocode = cachedSales.filter((p: any) => !p.latitude || !p.longitude);
    if (propertiesToGeocode.length > 0 && GOOGLE_MAPS_API_KEY) {
      await Promise.all(
        propertiesToGeocode.map(async (prop: any) => {
          const coords = await geocodeAddress(prop.address);
          if (coords) {
            prop.latitude = coords.lat;
            prop.longitude = coords.lng;
          }
        })
      );
      storeInCache(suburb, state, postcode, propertyType, cachedSales, cachedData.scraped_url);
    }

    return { sales: cachedSales, scrapedUrl: cachedData.scraped_url, cached: true };
  }

  // Scrape fresh data
  const { properties, scrapedUrl, debug } = await scrapeHomelyProperties(suburb, state, postcode, propertyType);

  // Mark with source suburb and neighbouring flag
  const markedProperties = properties.map(p => ({
    ...p,
    source_suburb: sourceSuburb,
    is_neighbouring: isNeighbouring
  }));

  // Geocode
  const propertiesToGeocode = markedProperties.filter(p => !p.latitude || !p.longitude);
  if (propertiesToGeocode.length > 0 && GOOGLE_MAPS_API_KEY) {
    await Promise.all(
      propertiesToGeocode.map(async (prop) => {
        const coords = await geocodeAddress(prop.address);
        if (coords) {
          prop.latitude = coords.lat;
          prop.longitude = coords.lng;
        }
      })
    );
  }

  // Cache
  if (markedProperties.length > 0) {
    storeInCache(suburb, state, postcode, propertyType, markedProperties, scrapedUrl);
  }

  return { sales: markedProperties, scrapedUrl, cached: false, debug };
}

/**
 * GET - Fetch historic sales for a property's area
 * Uses backend cache (7 days) to avoid repeated scraping
 * Also searches neighbouring suburb if configured
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
    const propertyType = property.property_type ? getHomelyPropertyType(property.property_type) : null;

    console.log(`[Historic Sales] Parsed: suburb=${suburb}, state=${state}, postcode=${postcode}, propertyType=${propertyType}`);

    // Fetch main suburb sales
    const mainSuburbName = suburb.replace(/-/g, ' ');
    const mainResult = await fetchSuburbSales(suburb, state, postcode, propertyType, mainSuburbName, false);

    let allSales = [...mainResult.sales];
    let neighbouringInfo: { suburb: string; state: string; postcode: string | null; scrapedUrl: string } | null = null;

    // Check if neighbouring suburb is configured
    const hasNeighbouringSuburb = property.neighbouring_suburb && property.neighbouring_state;
    if (hasNeighbouringSuburb) {
      const neighbourSuburb = property.neighbouring_suburb!.toLowerCase().replace(/\s+/g, '-');
      const neighbourState = property.neighbouring_state!.toLowerCase();
      const neighbourPostcode = property.neighbouring_postcode || null;
      const neighbourSuburbDisplay = property.neighbouring_suburb!;

      console.log(`[Historic Sales] Also searching neighbouring suburb: ${neighbourSuburbDisplay}, ${neighbourState.toUpperCase()} ${neighbourPostcode || ''}`);

      const neighbourResult = await fetchSuburbSales(
        neighbourSuburb,
        neighbourState,
        neighbourPostcode,
        propertyType,
        neighbourSuburbDisplay,
        true
      );

      allSales = [...allSales, ...neighbourResult.sales];
      neighbouringInfo = {
        suburb: neighbourSuburbDisplay,
        state: neighbourState.toUpperCase(),
        postcode: neighbourPostcode,
        scrapedUrl: neighbourResult.scrapedUrl
      };
    }

    // Sort all sales by sold_date_raw descending
    const sortedSales = allSales.sort((a, b) => {
      if (!a.sold_date_raw && !b.sold_date_raw) return 0;
      if (!a.sold_date_raw) return 1;
      if (!b.sold_date_raw) return -1;
      return new Date(b.sold_date_raw).getTime() - new Date(a.sold_date_raw).getTime();
    });

    const searchedAt = new Date().toISOString();

    return NextResponse.json({
      sales: sortedSales.map(p => ({
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
        source: p.source,
        latitude: p.latitude,
        longitude: p.longitude,
        homely_url: p.homely_url,
        source_suburb: p.source_suburb,
        is_neighbouring: p.is_neighbouring
      })),
      suburb: mainSuburbName,
      state: state.toUpperCase(),
      postcode,
      propertyType: propertyType || 'all',
      cached: mainResult.cached,
      searchedAt,
      total: sortedSales.length,
      scrapedUrl: mainResult.scrapedUrl,
      debug: mainResult.debug || null,
      // Neighbouring suburb info
      neighbouringSuburb: neighbouringInfo
    });

  } catch (error) {
    console.error('Historic sales error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ detail: 'Failed to fetch historic sales: ' + errorMessage }, { status: 500 });
  }
}
