import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import { Property, ConfidenceScoring, ValuationHistoryEntry } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-ts-gamma.vercel.app';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

// Sold property from scraping
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
  sold_date_raw?: Date | null;
  source: string;
  similarity_score?: number;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
}

/**
 * Calculate distance between two coordinates using the Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Geocode an address using Google Maps API
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng
      };
    }
  } catch (error) {
    console.log(`[Geocode] Failed for: ${address}`);
  }
  return null;
}

// Map property types to Homely filter values (plural form)
const PROPERTY_TYPE_TO_FILTER: { [key: string]: string } = {
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

function getPropertyTypeFilter(propertyType: string): string {
  const normalized = propertyType.toLowerCase().trim();
  return PROPERTY_TYPE_TO_FILTER[normalized] || normalized.replace(/\s+/g, '-');
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
 * Uses ScraperAPI proxy if SCRAPER_API_KEY is set (recommended for Vercel deployment)
 */
async function scrapeHomelyProperties(suburb: string, state: string, postcode: string | null, propertyType: string | null): Promise<SoldProperty[]> {
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
    fetchUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}&render=false`;
    fetchOptions = {};
    console.log(`[Evaluate] Using ScraperAPI proxy for: ${targetUrl}`);
  } else {
    fetchUrl = targetUrl;
    fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    };
    console.log(`[Evaluate] Direct fetch (no proxy): ${targetUrl}`);
  }

  try {
    const response = await fetch(fetchUrl, fetchOptions);

    if (!response.ok) {
      console.log(`[Evaluate] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!nextDataMatch) {
      console.log(`[Evaluate] No __NEXT_DATA__ found. HTML length: ${html.length}. Using proxy: ${!!scraperApiKey}`);
      return [];
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const listings = nextData?.props?.pageProps?.ssrData?.listings || [];
    console.log(`[Evaluate] Found ${listings.length} listings`);

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

    return properties;
  } catch (error: any) {
    console.log(`[Evaluate] Scrape error: ${error.message}`);
    return [];
  }
}

/**
 * Detect property density type from address
 * Returns: 'house' (full block), 'subdivision' (1/X or 2/X - half block), 'unit' (3+/X - shared block)
 */
function getPropertyDensityType(address: string, propertyType?: string | null): 'house' | 'subdivision' | 'unit' {
  if (!address) return 'house';

  const addr = address.trim();

  // Check for X/Y pattern at start of address
  const slashMatch = addr.match(/^(\d+)\/(\d+)/);
  if (slashMatch) {
    const unitNum = parseInt(slashMatch[1]);
    // 1/X or 2/X = subdivision (duplex, half block)
    if (unitNum <= 2) return 'subdivision';
    // 3+/X = unit/townhouse/apartment
    return 'unit';
  }

  // Check for "Unit X", "Apt X", "Suite X" patterns
  if (/^(unit|apt|apartment|suite|flat)\s+\d+/i.test(addr)) {
    return 'unit';
  }

  // Check property type
  if (propertyType) {
    const pt = propertyType.toLowerCase();
    if (['unit', 'apartment', 'flat'].some(t => pt.includes(t))) return 'unit';
    if (['townhouse', 'villa', 'duplex', 'semi'].some(t => pt.includes(t))) return 'subdivision';
  }

  return 'house';
}

/**
 * Calculate similarity score between target property and comparable
 * Heavily penalizes bedroom/bathroom mismatches, property type mismatches, and distance
 */
function calculateSimilarity(
  target: { beds: number; baths: number; land_area?: number | null; address?: string; property_type?: string | null },
  comparable: SoldProperty
): number {
  let score = 100;

  // Bedroom difference is the most important factor
  const bedDiff = Math.abs((target.beds || 3) - (comparable.beds || 3));
  score -= bedDiff * 25;

  // Bathroom difference is also important
  const bathDiff = Math.abs((target.baths || 2) - (comparable.baths || 2));
  score -= bathDiff * 20;

  // Check property density type mismatch
  const targetDensity = getPropertyDensityType(target.address || '', target.property_type);
  const compDensity = getPropertyDensityType(comparable.address, comparable.property_type);

  if (targetDensity !== compDensity) {
    if (
      (targetDensity === 'house' && compDensity === 'unit') ||
      (targetDensity === 'unit' && compDensity === 'house')
    ) {
      // Big mismatch: house vs unit - very different land/value
      score -= 40;
    } else {
      // Medium mismatch: house vs subdivision, or subdivision vs unit
      score -= 20;
    }
  }

  // Land area difference (if both have it)
  if (target.land_area && comparable.land_area) {
    const areaDiffPercent = Math.abs(target.land_area - comparable.land_area) / target.land_area;
    score -= Math.min(areaDiffPercent * 50, 20);
  }

  // Distance penalty - proximity is important!
  if (comparable.distance_km != null) {
    if (comparable.distance_km < 0.3) {
      // Very close (< 300m) - good bonus
      score = Math.min(100, score + 15);
    } else if (comparable.distance_km < 0.5) {
      // Close (300-500m) - bonus
      score = Math.min(100, score + 10);
    } else if (comparable.distance_km < 1) {
      // Near (500m - 1km) - small bonus
      score = Math.min(100, score + 5);
    } else if (comparable.distance_km > 10) {
      // Very far (> 10km) - severe penalty
      score -= 40;
    } else if (comparable.distance_km > 5) {
      // Far (5-10km) - big penalty
      score -= 25;
    } else if (comparable.distance_km > 3) {
      // Moderate (3-5km) - medium penalty
      score -= 15;
    } else if (comparable.distance_km > 2) {
      // Slight distance (2-3km) - small penalty
      score -= 10;
    } else if (comparable.distance_km > 1) {
      // 1-2km - small penalty (not ideal)
      score -= 5;
    }
  }

  // RECENCY penalty - recent sales are much more valuable!
  if (comparable.sold_date_raw) {
    const now = new Date();
    const soldDate = new Date(comparable.sold_date_raw);
    const monthsAgo = (now.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsAgo <= 3) {
      // Sold within 3 months - bonus
      score = Math.min(100, score + 10);
    } else if (monthsAgo <= 6) {
      // Sold within 6 months - small bonus
      score = Math.min(100, score + 5);
    } else if (monthsAgo > 36) {
      // Sold more than 3 years ago - severe penalty
      score -= 30;
    } else if (monthsAgo > 24) {
      // Sold 2-3 years ago - big penalty
      score -= 20;
    } else if (monthsAgo > 18) {
      // Sold 1.5-2 years ago - medium penalty
      score -= 15;
    } else if (monthsAgo > 12) {
      // Sold 1-1.5 years ago - small penalty
      score -= 10;
    }
    // 6-12 months: no adjustment
  }

  return Math.max(0, score);
}

/**
 * Find best matching comparable properties
 * Returns both the list of comparables AND the single best match
 */
function findBestComparables(
  targetProperty: Property,
  soldProperties: SoldProperty[],
  limit: number = 10
): { comparables: SoldProperty[]; bestMatch: SoldProperty | null; exactMatches: SoldProperty[] } {
  const targetBeds = targetProperty.beds || 3;
  const targetBaths = targetProperty.baths || 2;
  const target = {
    beds: targetBeds,
    baths: targetBaths,
    land_area: targetProperty.size || null,
    address: targetProperty.location,
    property_type: targetProperty.property_type
  };

  // Check target density type for logging
  const targetDensity = getPropertyDensityType(target.address || '', target.property_type);
  console.log(`[Evaluate] Target density type: ${targetDensity.toUpperCase()} (${target.property_type || 'unknown'}, address: ${target.address})`);

  const scored = soldProperties.map(prop => ({
    ...prop,
    similarity_score: calculateSimilarity(target, prop)
  }));

  scored.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

  // Find exact bed/bath matches - but ALSO must be recent (within 2 years) and reasonably close (within 3km)
  const now = new Date();
  const exactMatches = scored.filter(p => {
    if (p.beds !== targetBeds || p.baths !== targetBaths) return false;

    // Must be within 3km if we have distance data
    if (p.distance_km != null && p.distance_km > 3) return false;

    // Must be within 2 years if we have date data
    if (p.sold_date_raw) {
      const soldDate = new Date(p.sold_date_raw);
      const monthsAgo = (now.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo > 24) return false;
    }

    return true;
  });

  // Best match is the highest similarity score
  const bestMatch = scored.length > 0 ? scored[0] : null;

  // Log for debugging
  console.log(`[Evaluate] Target: ${targetBeds} bed, ${targetBaths} bath`);
  console.log(`[Evaluate] Found ${exactMatches.length} exact matches out of ${scored.length} total`);
  if (bestMatch) {
    console.log(`[Evaluate] Best match: ${bestMatch.address} - ${bestMatch.beds} bed, ${bestMatch.baths} bath - $${bestMatch.price} (${bestMatch.similarity_score}% similar)`);
  }

  return {
    comparables: scored.slice(0, limit),
    bestMatch,
    exactMatches
  };
}

/**
 * Calculate statistics from comparable properties
 * Prioritizes properties with high similarity scores (matching bed/bath)
 */
function calculateStatistics(properties: SoldProperty[]) {
  const validProperties = properties.filter(p => p.price > 0);

  if (validProperties.length === 0) {
    return { min: null, max: null, avg: null, median: null, weightedAvg: null, bestMatchPrice: null };
  }

  const prices = validProperties.map(p => p.price);
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  // Calculate weighted average based on similarity scores
  // Properties with higher similarity (matching beds/baths) get more weight
  let weightedSum = 0;
  let totalWeight = 0;

  for (const prop of validProperties) {
    const similarity = prop.similarity_score || 50;
    // Square the similarity to give much more weight to high matches
    const weight = Math.pow(similarity / 100, 2);
    weightedSum += prop.price * weight;
    totalWeight += weight;
  }

  const weightedAvg = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : avg;

  // Find the best matching property (highest similarity)
  const bestMatch = validProperties.reduce((best, current) =>
    (current.similarity_score || 0) > (best.similarity_score || 0) ? current : best
  );

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg,
    median,
    weightedAvg,
    bestMatchPrice: bestMatch.price,
    bestMatchSimilarity: bestMatch.similarity_score || 0
  };
}

/**
 * Calculate confidence scoring
 */
function calculateConfidenceScoring(
  comparables: SoldProperty[],
  property: Property
): ConfidenceScoring {
  const factors: ConfidenceScoring['factors'] = {
    comparables_count: { score: 0, weight: 25, description: 'Number of comparables' },
    data_recency: { score: 80, weight: 20, description: 'Data recency' },
    location_match: { score: 85, weight: 20, description: 'Location accuracy' },
    property_similarity: { score: 0, weight: 20, description: 'Property similarity' },
    price_consistency: { score: 0, weight: 15, description: 'Price consistency' }
  };

  const recommendations: string[] = [];

  const count = comparables.length;
  if (count >= 8) factors.comparables_count.score = 100;
  else if (count >= 5) factors.comparables_count.score = 80;
  else if (count >= 3) factors.comparables_count.score = 60;
  else if (count >= 1) factors.comparables_count.score = 40;
  else {
    factors.comparables_count.score = 10;
    recommendations.push('Limited comparable sales data available');
  }

  if (comparables.length > 0) {
    const avgSimilarity = comparables.reduce((sum, c) => sum + (c.similarity_score || 0), 0) / comparables.length;
    factors.property_similarity.score = Math.round(avgSimilarity);
  }

  const prices = comparables.map(c => c.price);
  if (prices.length >= 2) {
    const range = Math.max(...prices) - Math.min(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const cv = (range / avg) * 100;

    if (cv < 20) factors.price_consistency.score = 95;
    else if (cv < 40) factors.price_consistency.score = 75;
    else if (cv < 60) factors.price_consistency.score = 55;
    else factors.price_consistency.score = 35;
  }

  let overallScore = 0;
  let totalWeight = 0;
  for (const key of Object.keys(factors) as (keyof typeof factors)[]) {
    overallScore += factors[key].score * factors[key].weight;
    totalWeight += factors[key].weight;
  }
  overallScore = Math.round(overallScore / totalWeight);

  const level: 'high' | 'medium' | 'low' =
    overallScore >= 70 ? 'high' : overallScore >= 45 ? 'medium' : 'low';

  return { overall_score: overallScore, level, factors, recommendations };
}

function formatPrice(price: number | null): string {
  if (!price) return 'N/A';
  return '$' + price.toLocaleString();
}

/**
 * POST - Evaluate property (fetches from backend, no local DB)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const propertyId = resolvedParams.propertyId;

    // Fetch property from external backend
    console.log(`[Evaluate] Fetching property ${propertyId} from backend...`);
    const propertyResponse = await fetch(`${BACKEND_URL}/api/properties/${propertyId}`);

    if (!propertyResponse.ok) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    const property: Property = await propertyResponse.json();
    console.log(`[Evaluate] Got property: ${property.location}`);

    // Fetch historic sales from the same endpoint used by the UI
    // This ensures consistency - the AI sees the same data shown on the page
    console.log(`[Evaluate] Fetching historic sales for property ${propertyId}...`);

    let historicSalesData: any = null;
    try {
      // Use request URL to determine base URL - most reliable across all environments
      const requestUrl = new URL(request.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      console.log(`[Evaluate] Using base URL: ${baseUrl}`);

      const historicSalesResponse = await fetch(`${baseUrl}/api/properties/${propertyId}/historic-sales`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(`[Evaluate] Historic sales response status: ${historicSalesResponse.status}`);

      if (historicSalesResponse.ok) {
        historicSalesData = await historicSalesResponse.json();
        console.log(`[Evaluate] Got ${historicSalesData.sales?.length || 0} historic sales, best_match: ${historicSalesData.best_match?.address || 'none'}`);
      } else {
        const errorText = await historicSalesResponse.text();
        console.log(`[Evaluate] Historic sales fetch failed: ${historicSalesResponse.status} - ${errorText}`);
      }
    } catch (err) {
      console.log(`[Evaluate] Error fetching historic sales:`, err);
    }

    // Convert historic sales to our SoldProperty format
    let soldProperties: SoldProperty[] = [];
    if (historicSalesData?.sales) {
      soldProperties = historicSalesData.sales.map((sale: any) => ({
        id: sale.id || crypto.randomUUID(),
        address: sale.address,
        price: sale.price,
        beds: sale.beds,
        baths: sale.baths,
        cars: sale.cars,
        land_area: sale.land_area,
        property_type: sale.property_type || 'house',
        sold_date: sale.sold_date,
        sold_date_raw: sale.sold_date_raw ? new Date(sale.sold_date_raw) : null,
        source: sale.source || 'homely.com.au',
        similarity_score: sale.similarity_score,
        latitude: sale.latitude,
        longitude: sale.longitude,
        distance_km: sale.distance_km,
      }));
    }

    console.log(`[Evaluate] Using ${soldProperties.length} historic sales for valuation`);

    // Use the best match from historic sales (already sorted by similarity)
    const comparables = soldProperties.slice(0, 10);
    const bestMatch = historicSalesData?.best_match ? {
      ...historicSalesData.best_match,
      id: historicSalesData.best_match.id || crypto.randomUUID(),
    } : (comparables.length > 0 ? comparables[0] : null);

    // Filter exact matches (same beds/baths, recent, nearby)
    const exactMatches = comparables.filter((p: SoldProperty) =>
      p.beds === property.beds &&
      p.baths === property.baths &&
      (p.distance_km == null || p.distance_km <= 3)
    );

    console.log(`[Evaluate] Found ${comparables.length} comparable properties, ${exactMatches.length} exact matches`);

    // Calculate statistics
    const stats = calculateStatistics(comparables);
    const dataSource = comparables.length > 0 ? 'Homely.com.au (live)' : 'AI Knowledge';

    // Build comparables text for AI prompt
    let comparablesText = '';
    if (comparables.length > 0) {
      // Sort by similarity for display (highest first)
      const sortedComps = [...comparables].sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

      // Highlight the BEST MATCH prominently
      if (bestMatch) {
        const isExactMatch = bestMatch.beds === property.beds && bestMatch.baths === property.baths;
        comparablesText = `\n\n🎯 PRIMARY COMPARABLE (${isExactMatch ? 'EXACT MATCH' : 'CLOSEST MATCH'}):\n`;
        comparablesText += `Address: ${bestMatch.address}\n`;
        comparablesText += `Specs: ${bestMatch.beds} bed, ${bestMatch.baths} bath${bestMatch.land_area ? ', ' + bestMatch.land_area + ' m²' : ''}\n`;
        comparablesText += `SOLD PRICE: ${formatPrice(bestMatch.price)}\n`;
        comparablesText += `Sold Date: ${bestMatch.sold_date}\n`;
        comparablesText += `Similarity Score: ${bestMatch.similarity_score}%\n`;
        comparablesText += `\n⚠️ YOUR VALUATION SHOULD BE BASED PRIMARILY ON THIS PROPERTY'S SALE PRICE OF ${formatPrice(bestMatch.price)}\n`;
      }

      // Show exact matches if we have them
      if (exactMatches.length > 1) {
        comparablesText += `\n\n✅ EXACT SPEC MATCHES (${property.beds} bed, ${property.baths} bath):\n`;
        for (const comp of exactMatches.slice(0, 5)) {
          comparablesText += `- ${comp.address}: ${formatPrice(comp.price)} | Sold: ${comp.sold_date}\n`;
        }
        const exactPrices = exactMatches.map(e => e.price);
        const exactAvg = Math.round(exactPrices.reduce((a, b) => a + b, 0) / exactPrices.length);
        comparablesText += `Average of exact matches: ${formatPrice(exactAvg)}\n`;
      }

      comparablesText += `\n\nOTHER COMPARABLE SALES (from ${dataSource}):\n`;
      for (const comp of sortedComps.slice(0, 8)) {
        if (comp.id === bestMatch?.id) continue; // Skip best match, already shown
        const matchLabel = (comp.similarity_score || 0) >= 85 ? ' [GOOD MATCH]' : '';
        comparablesText += `- ${comp.address}: ${formatPrice(comp.price)} | ${comp.beds || 'N/A'} bed, ${comp.baths || 'N/A'} bath${comp.land_area ? ' | ' + comp.land_area + ' m²' : ''} | Sold: ${comp.sold_date} | Similarity: ${comp.similarity_score || 0}%${matchLabel}\n`;
      }
      comparablesText += `\nMARKET STATISTICS:\n`;
      comparablesText += `- Price Range: ${formatPrice(stats.min)} - ${formatPrice(stats.max)}\n`;
      comparablesText += `- All Sales Average: ${formatPrice(stats.avg)}\n`;
      if (exactMatches.length > 0) {
        const exactPrices = exactMatches.map(e => e.price);
        const exactAvg = Math.round(exactPrices.reduce((a, b) => a + b, 0) / exactPrices.length);
        comparablesText += `- Exact Match Average: ${formatPrice(exactAvg)} ⬅️ USE THIS\n`;
      }
    }

    // Build RP Data report section if available
    let rpDataSection = '';
    if ((property as any).rp_data_report) {
      rpDataSection = `\n\nRP DATA PROPERTY REPORT:\n${(property as any).rp_data_report}\n`;
      console.log(`[Evaluate] Including RP Data report`);
    }

    // Build Additional Report section if available
    let additionalReportSection = '';
    if ((property as any).additional_report) {
      additionalReportSection = `\n\nADDITIONAL PROPERTY REPORT:\n${(property as any).additional_report}\n`;
      console.log(`[Evaluate] Including Additional report`);
    }

    // Build AI prompt
    const propertyDesc = `
Location: ${property.location}
Property Type: ${property.property_type || 'Residential'}
Bedrooms: ${property.beds}
Bathrooms: ${property.baths}
Car Parks: ${property.carpark}
Size: ${property.size ? property.size + ' sqm' : 'Not specified'}
${(property as any).extra_features ? 'Features: ' + (property as any).extra_features : ''}
${comparablesText}${rpDataSection}${additionalReportSection}`;

    const hasRpData = !!(property as any).rp_data_report;
    const hasAdditionalReport = !!(property as any).additional_report;
    const hasComparables = comparables.length > 0;

    let dataSourcesNote = '';
    if (hasRpData || hasAdditionalReport || hasComparables) {
      const sources = [];
      if (hasComparables) sources.push(`${comparables.length} comparable sales`);
      if (hasRpData) sources.push('RP Data property report');
      if (hasAdditionalReport) sources.push('additional property report');
      dataSourcesNote = `\n\nYou have access to: ${sources.join(', ')}. Use ALL available data to inform your valuation.`;
    }

    const openai = getOpenAI();

    // Build messages array - include images if available for visual analysis
    // Build valuation anchor text - this is CRITICAL for accurate valuations
    let valuationAnchor = '';
    if (exactMatches.length > 0) {
      const exactPrices = exactMatches.map(e => e.price);
      const exactAvg = Math.round(exactPrices.reduce((a, b) => a + b, 0) / exactPrices.length);
      const exactMin = Math.min(...exactPrices);
      const exactMax = Math.max(...exactPrices);
      valuationAnchor = `
⚠️ CRITICAL VALUATION ANCHOR - YOU MUST USE THIS:
We have ${exactMatches.length} EXACT MATCH comparable sale(s) with the same bed/bath configuration (${property.beds} bed, ${property.baths} bath):
- Exact Match Price Range: ${formatPrice(exactMin)} to ${formatPrice(exactMax)}
- Exact Match Average: ${formatPrice(exactAvg)}

YOUR ESTIMATED VALUE RANGE MUST BE BASED ON THESE EXACT MATCH PRICES.
- If property condition is average: use ${formatPrice(Math.round(exactAvg * 0.95))} to ${formatPrice(Math.round(exactAvg * 1.05))}
- If property is in excellent/renovated condition: use ${formatPrice(Math.round(exactAvg * 1.0))} to ${formatPrice(Math.round(exactAvg * 1.10))}
- If property needs work/dated: use ${formatPrice(Math.round(exactAvg * 0.85))} to ${formatPrice(Math.round(exactAvg * 0.95))}

DO NOT estimate values significantly different from the comparable sales data. The comparable sales are REAL RECENT SALES in the same area.`;
    } else if (bestMatch) {
      valuationAnchor = `
⚠️ CRITICAL VALUATION ANCHOR - YOU MUST USE THIS:
The PRIMARY COMPARABLE sold for ${formatPrice(bestMatch.price)}.
Your estimated value range MUST be anchored to this price:
- Base your valuation on ${formatPrice(Math.round(bestMatch.price * 0.90))} to ${formatPrice(Math.round(bestMatch.price * 1.10))}
- Adjust within this range based on property condition and spec differences.

DO NOT estimate values significantly different from the comparable sales data.`;
    }

    // Get top 3 comparables for the Market Analysis section
    const top3Comparables = comparables.slice(0, 3);
    let top3ComparablesText = '';
    if (top3Comparables.length > 0) {
      top3ComparablesText = top3Comparables.map((c, i) =>
        `${i + 1}. ${c.address} - SOLD for ${formatPrice(c.price)} (${c.beds} bed, ${c.baths} bath, sold ${c.sold_date})`
      ).join('\n');
    }

    const systemPrompt = `You are an expert Australian property valuer with expertise in assessing property condition and build quality from photos.

⚠️⚠️⚠️ CRITICAL INSTRUCTION - READ THIS CAREFULLY ⚠️⚠️⚠️
You MUST ONLY use the REAL comparable sales data provided below.
DO NOT INVENT, FABRICATE, OR MAKE UP ANY ADDRESSES OR SALE PRICES.
DO NOT use placeholder addresses like "21 Example St" or "nearby property".
EVERY address you cite MUST be copied EXACTLY from the comparable sales data provided.

If you cannot find suitable comparables in the provided data, say "Limited comparable data available" - DO NOT make up fake sales.

${valuationAnchor}

THE ONLY COMPARABLE SALES YOU MAY REFERENCE IN YOUR REPORT ARE:
${top3ComparablesText || 'No comparable sales data available - provide estimate based on general market knowledge only and clearly state this limitation.'}

${property.images && property.images.length > 0 ? `
PHOTO ANALYSIS INSTRUCTIONS:
You have been provided with ${property.images.length} photo(s) of this property. Carefully analyze them to assess:
- Build quality and construction standard (budget, standard, premium, luxury)
- Property condition (poor, fair, good, excellent, renovated)
- Interior finishes and fixtures quality
- Kitchen and bathroom quality/age
- Flooring type and condition
- Natural light and layout appeal
- Outdoor areas, landscaping, pool if visible
- Overall presentation and street appeal
- Any visible issues or standout features

Use your visual assessment to ADJUST the valuation up or down from the comparable sale prices (NOT to create a new estimate):
- Premium finishes/recent renovation: +5-10% above comparable average
- Good condition, modern: at comparable average
- Dated but well-maintained: -5-10% below comparable average
- Poor condition/needs work: -10-15% below comparable average
` : ''}

Format your response as a clear, professional report with:
1. Property Overview
2. ${property.images && property.images.length > 0 ? 'Visual Assessment (detailed analysis of photos - build quality, condition, finishes, presentation)\n3. ' : ''}Market Analysis - **Comparable Sales Data:** (YOU MUST LIST THE TOP 3 SALES FROM THE DATA ABOVE WITH THEIR EXACT ADDRESSES AND PRICES - DO NOT MAKE UP ANY ADDRESSES)
${property.images && property.images.length > 0 ? '4. ' : '3. '}RP Data & Additional Report Insights (if provided - extract key valuation data, land value, improvements value, previous sales, etc.)
${property.images && property.images.length > 0 ? '5. ' : '4. '}Valuation Assessment (explain how you derived the value FROM THE COMPARABLE SALES)
${property.images && property.images.length > 0 ? '6. ' : '5. '}Estimated Value Range (provide specific $ figures BASED ON THE COMPARABLE SALES DATA - your range MUST align with the comparable prices)
${property.images && property.images.length > 0 ? '7. ' : '6. '}Key Factors Affecting Value

⚠️ REMINDER: In Section ${property.images && property.images.length > 0 ? '3' : '2'} Market Analysis, you MUST cite the EXACT addresses and prices from the comparable sales data provided. Do NOT invent addresses.

Be specific with dollar amounts. Your estimated value MUST be justified by and consistent with the comparable sales provided.${property.images && property.images.length > 0 ? ' Explain how the visual condition/quality affects value relative to the comparables.' : ''}`;

    // Build user message content - text + images if available
    type MessageContent = string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' | 'auto' } }>;

    let userContent: MessageContent;

    if (property.images && property.images.length > 0) {
      // Use vision mode with images
      const imageContents: Array<{ type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' | 'auto' } }> = property.images
        .slice(0, 10) // Limit to 10 images to manage token costs
        .map(url => ({
          type: 'image_url' as const,
          image_url: { url, detail: 'high' as const }
        }));

      userContent = [
        { type: 'text' as const, text: `Please provide a valuation report for this property. Analyze the attached photos to assess build quality, condition, and presentation:\n${propertyDesc}` },
        ...imageContents
      ];
      console.log(`[Evaluate] Including ${imageContents.length} images for visual analysis`);
    } else {
      userContent = `Please provide a valuation report for this property:\n${propertyDesc}`;
      console.log(`[Evaluate] No images available for visual analysis`);
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userContent
        }
      ],
      temperature: 0.3,
      max_tokens: 3500 // Increased for visual analysis content
    });

    const evaluationReport = completion.choices[0]?.message?.content || 'Unable to generate evaluation.';

    // Calculate confidence scoring
    const confidenceScoring = calculateConfidenceScoring(comparables, property);

    // Prepare valuation history entry
    // PRIORITY: Use exact matches average > best match price > weighted average
    let estimatedValue: number;
    let valuationBasis: string;

    if (exactMatches.length > 0) {
      // Best case: we have exact bed/bath matches - use their average
      const exactPrices = exactMatches.map(e => e.price);
      estimatedValue = Math.round(exactPrices.reduce((a, b) => a + b, 0) / exactPrices.length);
      valuationBasis = `Average of ${exactMatches.length} exact ${property.beds}bed/${property.baths}bath matches`;
      console.log(`[Evaluate] Using EXACT MATCH average: $${estimatedValue} from ${exactMatches.length} properties`);
    } else if (bestMatch) {
      // Next best: use the closest match price
      estimatedValue = bestMatch.price;
      valuationBasis = `Best match: ${bestMatch.beds}bed/${bestMatch.baths}bath at ${bestMatch.address}`;
      console.log(`[Evaluate] Using BEST MATCH price: $${estimatedValue} (${bestMatch.similarity_score}% similar)`);
    } else {
      // Fallback to weighted average
      estimatedValue = stats.weightedAvg || stats.median || stats.avg || 0;
      valuationBasis = 'Weighted average of available comparables';
      console.log(`[Evaluate] Using WEIGHTED AVERAGE: $${estimatedValue}`);
    }

    const valueRange = estimatedValue * 0.1;
    console.log(`[Evaluate] Final valuation: $${estimatedValue} (${valuationBasis})`);
    const valuationEntry: ValuationHistoryEntry = {
      date: new Date().toISOString(),
      estimated_value: estimatedValue,
      value_low: Math.round(estimatedValue - valueRange),
      value_high: Math.round(estimatedValue + valueRange),
      confidence_score: confidenceScoring.overall_score,
      confidence_level: confidenceScoring.level,
      data_source: dataSource,
      comparables_count: comparables.length,
      notes: valuationBasis
    };

    // Map comparables to response format
    const comparablesWithIds = comparables.map(comp => ({
      id: comp.id,
      address: comp.address,
      price: comp.price,
      beds: comp.beds,
      baths: comp.baths,
      carpark: comp.cars,
      land_area: comp.land_area,
      property_type: comp.property_type,
      sold_date: comp.sold_date,
      source: comp.source,
      similarity_score: comp.similarity_score || 0,
      distance_km: comp.distance_km || null,
      selected: true
    }));

    // Format best match for response
    const bestMatchData = bestMatch ? {
      id: bestMatch.id,
      address: bestMatch.address,
      price: bestMatch.price,
      beds: bestMatch.beds,
      baths: bestMatch.baths,
      carpark: bestMatch.cars,
      land_area: bestMatch.land_area,
      property_type: bestMatch.property_type,
      sold_date: bestMatch.sold_date,
      source: bestMatch.source,
      similarity_score: bestMatch.similarity_score || 0,
      is_exact_match: bestMatch.beds === property.beds && bestMatch.baths === property.baths
    } : null;

    const comparablesData = {
      comparable_sold: comparablesWithIds,
      best_match: bestMatchData,
      exact_matches_count: exactMatches.length,
      statistics: {
        total_found: comparables.length,
        sold_count: comparables.length,
        price_range: stats,
        exact_match_avg: exactMatches.length > 0
          ? Math.round(exactMatches.map(e => e.price).reduce((a, b) => a + b, 0) / exactMatches.length)
          : null
      },
      valuation_basis: valuationBasis,
      data_source: dataSource,
      domain_api_error: comparables.length === 0 ? `No sold properties found for ${property.location}` : null
    };

    // Save evaluation to backend
    const saveUrl = `${BACKEND_URL}/api/properties/${propertyId}/save-evaluation`;
    console.log(`[Evaluate] Saving evaluation to: ${saveUrl}`);

    try {
      const saveResponse = await fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_report: evaluationReport,
          comparables_data: comparablesData,
          confidence_scoring: confidenceScoring,
          valuation_entry: valuationEntry
        })
      });

      const saveResult = await saveResponse.text();
      console.log(`[Evaluate] Save response: ${saveResponse.status} - ${saveResult}`);

      if (!saveResponse.ok) {
        console.error(`[Evaluate] Failed to save evaluation: ${saveResponse.status} - ${saveResult}`);
      } else {
        console.log(`[Evaluate] Evaluation saved successfully for property ${propertyId}`);
      }
    } catch (saveError) {
      console.error(`[Evaluate] Could not save to backend:`, saveError);
    }

    return NextResponse.json({
      evaluation_report: evaluationReport,
      comparables_data: comparablesData,
      confidence_scoring: confidenceScoring,
      valuation_history: [valuationEntry, ...(property.valuation_history || [])].slice(0, 20),
      success: true
    });

  } catch (error) {
    console.error('Evaluate property error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ detail: 'Failed to evaluate property: ' + errorMessage }, { status: 500 });
  }
}
