import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import { Property, ConfidenceScoring, ValuationHistoryEntry } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://propertyval-api.azurewebsites.net';

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
 * Uses ScraperAPI proxy if SCRAPER_API_KEY is set (recommended for cloud deployment)
 */
async function scrapeHomelyProperties(suburb: string, state: string, postcode: string | null, propertyType: string | null): Promise<SoldProperty[]> {
  let targetUrl = postcode
    ? `https://www.homely.com.au/sold-properties/${suburb}-${state}-${postcode}`
    : `https://www.homely.com.au/sold-properties/${suburb}-${state}`;

  if (propertyType) {
    targetUrl += `?propertytype=${propertyType}`;
  }

  // Use ScraperAPI proxy if available (bypasses IP blocking on cloud hosts)
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
    if (comparable.distance_km < 0.2) {
      // Ultra close (< 200m) - big bonus
      score = Math.min(100, score + 40);
    } else if (comparable.distance_km < 0.35) {
      // Very close (200-350m) - good bonus
      score = Math.min(100, score + 30);
    } else if (comparable.distance_km < 0.5) {
      // Close (350-500m) - bonus
      score = Math.min(100, score + 15);
    } else if (comparable.distance_km > 5) {
      // Very far (> 5km) - severe penalty
      score -= 25;
    } else if (comparable.distance_km > 2) {
      // Far (2-5km) - big penalty
      score -= 15;
    } else if (comparable.distance_km > 1) {
      // Moderate (1-2km) - small penalty
      score -= 8;
    }
    // 500m - 1km: no adjustment
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

    // Check if pre-calculated historic sales were passed in the request body
    // This allows the frontend to pass the SAME data that HistoricSalesCard displays
    let requestBody: { historicSales?: any[]; evaluationSource?: 'homely' | 'reports' } = {};
    try {
      requestBody = await request.json();
    } catch {
      // No body or invalid JSON - that's fine, we'll fetch fresh
    }

    const evaluationSource = requestBody.evaluationSource || 'homely';
    console.log(`[Evaluate] Evaluation source: ${evaluationSource}`);

    let soldProperties: SoldProperty[] = [];

    // When using reports as source, we don't require Homely data
    if (evaluationSource === 'reports') {
      console.log(`[Evaluate] Using RP Data / Additional Report as PRIMARY source`);
      console.log(`[Evaluate] RP Data available: ${!!(property as any).rp_data_report}`);
      console.log(`[Evaluate] Additional Report available: ${!!(property as any).additional_report}`);

      // Still accept Homely data if provided, but it's supplementary
      if (requestBody.historicSales && requestBody.historicSales.length > 0) {
        console.log(`[Evaluate] Also including ${requestBody.historicSales.length} Homely sales as supplementary data`);
        soldProperties = requestBody.historicSales.map((s: any) => ({
          id: s.id || crypto.randomUUID(),
          address: s.address,
          price: s.price,
          beds: s.beds,
          baths: s.baths,
          cars: s.cars,
          land_area: s.land_area,
          property_type: s.property_type,
          sold_date: s.sold_date,
          sold_date_raw: s.sold_date_raw ? new Date(s.sold_date_raw) : null,
          source: s.source || 'homely.com.au',
          similarity_score: s.similarity,
          latitude: s.latitude,
          longitude: s.longitude,
          distance_km: s.distance,
        }));
      }
    } else if (requestBody.historicSales && requestBody.historicSales.length > 0) {
      // USE PRE-CALCULATED DATA FROM FRONTEND (same as HistoricSalesCard)
      console.log(`[Evaluate] Using ${requestBody.historicSales.length} pre-calculated sales from frontend`);
      soldProperties = requestBody.historicSales.map((s: any) => ({
        id: s.id || crypto.randomUUID(),
        address: s.address,
        price: s.price,
        beds: s.beds,
        baths: s.baths,
        cars: s.cars,
        land_area: s.land_area,
        property_type: s.property_type,
        sold_date: s.sold_date,
        sold_date_raw: s.sold_date_raw ? new Date(s.sold_date_raw) : null,
        source: s.source || 'homely.com.au',
        similarity_score: s.similarity, // Use the pre-calculated similarity from HistoricSalesCard
        latitude: s.latitude,
        longitude: s.longitude,
        distance_km: s.distance,
      }));
      // Already sorted by frontend, but sort again just in case
      soldProperties.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    } else {
      // NO FALLBACK - The evaluation MUST use the same data shown in HistoricSalesCard
      // If no data was passed, return an error so the frontend can retry
      console.error(`[Evaluate] ERROR: No historicSales data received from frontend!`);
      console.error(`[Evaluate] The HistoricSalesCard callback may not have fired yet.`);
      console.error(`[Evaluate] Request body keys:`, Object.keys(requestBody));

      return NextResponse.json(
        {
          detail: 'Historic sales data not loaded yet. Please wait for the Historic Property Sales section to load, then try again.',
          error_code: 'HISTORIC_SALES_NOT_READY'
        },
        { status: 400 }
      );
    }

    console.log(`[Evaluate] Using ${soldProperties.length} historic sales for valuation`);
    if (soldProperties.length > 0) {
      console.log(`[Evaluate] Top 3 matches:`);
      soldProperties.slice(0, 3).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.address} - $${s.price} (${s.beds}bed/${s.baths}bath) - ${s.similarity_score}% match`);
      });
    }

    // Take top 10 by similarity
    const comparables = soldProperties.slice(0, 10);

    // Best match is now the first one (highest similarity)
    const bestMatch = comparables.length > 0 ? comparables[0] : null;

    // Filter exact matches (same beds/baths, recent, nearby)
    const exactMatches = comparables.filter((p: SoldProperty) =>
      p.beds === property.beds &&
      p.baths === property.baths &&
      (p.distance_km == null || p.distance_km <= 3)
    );

    console.log(`[Evaluate] Found ${comparables.length} comparable properties, ${exactMatches.length} exact matches`);

    // Calculate statistics
    const stats = calculateStatistics(comparables);

    // Determine data source label based on evaluation source (will be updated later after checking reports)
    const hasRpDataEarly = !!(property as any).rp_data_report;
    const hasAdditionalReportEarly = !!(property as any).additional_report;
    const usingReportsAsPrimaryEarly = evaluationSource === 'reports';

    let dataSource: string;
    if (usingReportsAsPrimaryEarly && (hasRpDataEarly || hasAdditionalReportEarly)) {
      const sources = [];
      if (hasRpDataEarly) sources.push('RP Data Report');
      if (hasAdditionalReportEarly) sources.push('Additional Report');
      dataSource = sources.join(' + ');
      if (comparables.length > 0) {
        dataSource += ' (with Homely supplementary data)';
      }
    } else if (comparables.length > 0) {
      dataSource = 'Homely.com.au (live)';
    } else {
      dataSource = 'AI Knowledge';
    }

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
    const rpDataReportText = (property as any).rp_data_report;
    if (rpDataReportText) {
      rpDataSection = `

═══════════════════════════════════════════════════════════════
📊 RP DATA PROPERTY REPORT (USE THIS FOR VALUATION):
═══════════════════════════════════════════════════════════════
${rpDataReportText}
═══════════════════════════════════════════════════════════════
`;
      console.log(`[Evaluate] Including RP Data report (${rpDataReportText.length} chars)`);
      console.log(`[Evaluate] RP Data preview: ${rpDataReportText.substring(0, 200)}...`);
    } else {
      console.log(`[Evaluate] No RP Data report found on property`);
    }

    // Build Additional Report section if available
    let additionalReportSection = '';
    const additionalReportText = (property as any).additional_report;
    if (additionalReportText) {
      additionalReportSection = `

═══════════════════════════════════════════════════════════════
📄 ADDITIONAL PROPERTY REPORT (USE THIS FOR VALUATION):
═══════════════════════════════════════════════════════════════
${additionalReportText}
═══════════════════════════════════════════════════════════════
`;
      console.log(`[Evaluate] Including Additional report (${additionalReportText.length} chars)`);
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
    const usingReportsAsPrimary = evaluationSource === 'reports';

    let dataSourcesNote = '';
    if (hasRpData || hasAdditionalReport || hasComparables) {
      const sources = [];
      if (hasComparables) sources.push(`${comparables.length} comparable sales`);
      if (hasRpData) sources.push('RP Data property report');
      if (hasAdditionalReport) sources.push('additional property report');
      dataSourcesNote = `\n\nYou have access to: ${sources.join(', ')}. Use ALL available data to inform your valuation.`;
    }

    // Build priority instruction for RP Data/Additional Report based evaluation
    let rpDataPriorityInstruction = '';
    if (usingReportsAsPrimary && (hasRpData || hasAdditionalReport)) {
      rpDataPriorityInstruction = `
⚠️⚠️⚠️ PRIMARY DATA SOURCE PRIORITY ⚠️⚠️⚠️
The user has selected RP DATA REPORT and/or ADDITIONAL REPORT as the PRIMARY valuation source.

**REPORT SECTION INSTRUCTIONS:**

## Market Analysis Section:
- STILL include the Homely comparable sales data (addresses and prices) for market context
- This provides useful reference information about recent sales in the area
- Format these as "Comparable Sales Data" subsection

## Valuation Assessment Section:
- Your Starting Point MUST come from the RP Data Report or Additional Report - NOT from Homely sales
- Look for values like: Capital Value, CV, RV, Land Value, Estimated Value, recent sale price, valuation estimate
- Example: "**Starting Point:** RP Data Report Capital Value of $X" or "**Starting Point:** Additional Report valuation of $X"
- DO NOT say "Starting Point: Recent sale price of $X" if that price came from Homely data
- Apply adjustments from the report values, not from comparable sales

${hasRpData ? '📊 RP DATA REPORT IS AVAILABLE - EXTRACT AND USE ITS VALUATIONS FOR THE VALUATION ASSESSMENT' : ''}
${hasAdditionalReport ? '📄 ADDITIONAL REPORT IS AVAILABLE - EXTRACT AND USE ITS VALUATIONS FOR THE VALUATION ASSESSMENT' : ''}
`;
    }

    const openai = getOpenAI();

    // Build messages array - include images if available for visual analysis
    // Build valuation anchor text - this is CRITICAL for accurate valuations
    // Calculate time adjustments for each comparable
    const today = new Date();
    const subjectLandArea = property.size || 0;

    let valuationAnchor = '';
    if (exactMatches.length > 0 || bestMatch) {
      const refProperty = exactMatches.length > 0 ? exactMatches[0] : bestMatch!;
      const refPrice = refProperty.price;
      const refLandArea = refProperty.land_area || 0;

      // Calculate months since sale
      let monthsSinceSale = 0;
      if (refProperty.sold_date_raw) {
        const soldDate = new Date(refProperty.sold_date_raw);
        monthsSinceSale = Math.round((today.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      }

      // Calculate time adjustment (assume 5% annual growth = ~0.4% per month)
      const timeAdjustmentPercent = Math.min(monthsSinceSale * 0.4, 15); // Cap at 15%
      const timeAdjustment = Math.round(refPrice * (timeAdjustmentPercent / 100));

      // Calculate land area adjustment ($1000/sqm is typical for QLD)
      const landDifference = subjectLandArea - refLandArea;
      const landAdjustment = landDifference > 0 ? landDifference * 1000 : landDifference * 800; // Less penalty for smaller

      // Build adjustment breakdown
      let adjustmentText = '';
      if (monthsSinceSale > 0 || landDifference !== 0) {
        adjustmentText = `
MANDATORY ADJUSTMENTS TO APPLY:
1. TIME ADJUSTMENT: The comparable sold ${monthsSinceSale} months ago.
   - Market growth since then: +${timeAdjustmentPercent.toFixed(1)}% = +${formatPrice(timeAdjustment)}

2. LAND SIZE ADJUSTMENT: Subject has ${subjectLandArea}m², comparable has ${refLandArea}m² (difference: ${landDifference > 0 ? '+' : ''}${landDifference}m²)
   - At $1,000/sqm: ${landDifference > 0 ? '+' : ''}${formatPrice(Math.abs(landAdjustment))}

3. QUALITY/CONDITION: Assess from photos and description
   - Superior build/views/condition: +5-10%
   - Average condition: no adjustment
   - Inferior condition: -5-10%

STARTING PRICE: ${formatPrice(refPrice)}
+ Time adjustment: ${formatPrice(timeAdjustment)}
+ Land adjustment: ${formatPrice(landAdjustment)}
= ADJUSTED BASE: ${formatPrice(refPrice + timeAdjustment + landAdjustment)}

YOUR VALUATION MUST BE AT OR ABOVE ${formatPrice(refPrice + timeAdjustment + landAdjustment)} for a property that is EQUAL OR BETTER than the comparable.
`;
      }

      if (exactMatches.length > 0) {
        const exactPrices = exactMatches.map(e => e.price);
        const exactAvg = Math.round(exactPrices.reduce((a, b) => a + b, 0) / exactPrices.length);
        valuationAnchor = `
⚠️ CRITICAL VALUATION ANCHOR:
We have ${exactMatches.length} EXACT MATCH comparable sale(s) (${property.beds} bed, ${property.baths} bath):
- Primary Comparable: ${refProperty.address}
- Sale Price: ${formatPrice(refPrice)}
- Sold: ${refProperty.sold_date} (${monthsSinceSale} months ago)
- Land Size: ${refLandArea}m²
${adjustmentText}
⚠️ NEVER value a SUPERIOR property LOWER than an INFERIOR comparable. If the subject property has MORE land, is NEWER, has BETTER views, or is in BETTER condition - the value MUST be HIGHER than the comparable.`;
      } else {
        valuationAnchor = `
⚠️ CRITICAL VALUATION ANCHOR:
PRIMARY COMPARABLE: ${bestMatch!.address}
- Sale Price: ${formatPrice(bestMatch!.price)}
- Sold: ${bestMatch!.sold_date} (${monthsSinceSale} months ago)
- Land Size: ${refLandArea}m²
${adjustmentText}
⚠️ NEVER value a SUPERIOR property LOWER than an INFERIOR comparable.`;
      }
    }

    // Get top 5 comparables for the Market Analysis section (increased from 3)
    const topComparables = comparables.slice(0, 5);
    let topComparablesText = '';
    let comparablesTemplate = '';
    if (topComparables.length > 0) {
      topComparablesText = topComparables.map((c, i) =>
        `${i + 1}. ${c.address} - SOLD for ${formatPrice(c.price)} (${c.beds} bed, ${c.baths} bath, ${c.land_area ? c.land_area + ' m², ' : ''}${c.similarity_score}% match, sold ${c.sold_date})`
      ).join('\n');

      // Create a template showing exactly how the AI should format the Market Analysis section
      comparablesTemplate = `
TEMPLATE FOR MARKET ANALYSIS SECTION - COPY THIS FORMAT EXACTLY:

## 3. Market Analysis

**Comparable Sales Data:**

The following recent sales from the Historic Property Sales database provide the foundation for this valuation:

${topComparables.map((c, i) =>
`${i + 1}. **${c.address}**
   - Sale Price: ${formatPrice(c.price)}
   - Specs: ${c.beds} bed, ${c.baths} bath${c.land_area ? ', ' + c.land_area + ' m²' : ''}
   - Sold: ${c.sold_date}
   - Match Score: ${c.similarity_score}%`
).join('\n\n')}

**Market Summary:**
- Price Range: ${formatPrice(stats.min)} to ${formatPrice(stats.max)}
- Average Sale Price: ${formatPrice(stats.avg)}
${exactMatches.length > 0 ? `- Exact Match Average (${property.beds}bed/${property.baths}bath): ${formatPrice(Math.round(exactMatches.map(e => e.price).reduce((a, b) => a + b, 0) / exactMatches.length))}` : ''}
`;
    }

    // Calculate max reasonable value (highest comparable + 15% max)
    const maxComparablePrice = comparables.length > 0 ? Math.max(...comparables.map(c => c.price)) : 0;
    const minComparablePrice = comparables.length > 0 ? Math.min(...comparables.map(c => c.price)) : 0;
    const maxReasonableValue = Math.round(maxComparablePrice * 1.15);
    const avgComparablePrice = comparables.length > 0 ? Math.round(comparables.reduce((sum, c) => sum + c.price, 0) / comparables.length) : 0;

    // Build the valuation constraints section based on data source
    let valuationConstraints = '';
    if (usingReportsAsPrimary && (hasRpData || hasAdditionalReport)) {
      valuationConstraints = `
⚠️⚠️⚠️ CRITICAL: RP DATA REPORT MODE - USE RP DATA VALUES FOR VALUATION ⚠️⚠️⚠️

THE USER HAS SELECTED RP DATA AS THE PRIMARY VALUATION SOURCE.

**STEP 1: VERIFY THE RP DATA IS FOR THE CORRECT PROPERTY**
The subject property is: ${property.location}
Check that the RP Data Report address matches or is for the same property.
- If YES (same property): Use the RP Data values as your PRIMARY valuation anchor
- If NO (different property): State this mismatch and fall back to Homely comparable sales for valuation

**STEP 2: IF RP DATA MATCHES - EXTRACT THE VALUES**
Look in the RP DATA PROPERTY REPORT section below for:
- "ESTIMATED VALUE RANGE: $X - $Y" ← This is your PRIMARY valuation anchor
- "Capital Value: $X" or "CV: $X"
- "Land Value: $X" and "Improvements Value: $X"
- Any valuation or estimated price range

**STEP 3: USE RP DATA VALUES FOR VALUATION**
In your Valuation Assessment section, you MUST:
- State: "Based on the RP Data Report estimated value of $X - $Y..."
- Use the RP Data values as your starting point
- Apply adjustments for time since report, market conditions, property condition
- Your final valuation should be BASED ON the RP Data figures

**STEP 4: DISPLAY HOMELY DATA FOR CONTEXT ONLY**
- Include Homely sales in the Market Analysis section
- These provide MARKET CONTEXT showing recent sales in the area
- Do NOT use Homely sales as the valuation anchor when RP Data is selected
- The Homely data helps validate/support the RP Data valuation

**IN THE "RP Data & Additional Report Insights" SECTION:**
- Quote the exact estimated value range from the report
- Extract any Land Value, Improvements Value, Capital Value
- Note the report date
- Confirm whether the RP Data address matches the subject property

${rpDataPriorityInstruction}`;
    } else {
      valuationConstraints = `
⚠️⚠️⚠️ CRITICAL VALUATION CONSTRAINTS ⚠️⚠️⚠️
1. Your valuation MUST be grounded in the comparable sales data provided
2. The comparable sales range from ${formatPrice(minComparablePrice)} to ${formatPrice(maxComparablePrice)}
3. Your estimated value CANNOT exceed ${formatPrice(maxReasonableValue)} (highest comparable + 15%) unless you provide EXCEPTIONAL justification
4. The average comparable price is ${formatPrice(avgComparablePrice)} - your estimate should be NEAR this unless there are clear differences
5. A property with LESS land area than comparables should be valued LOWER, not higher
6. Time adjustments: ~5% per year maximum (not more)
7. Quality/condition adjustments: -10% to +10% maximum (not more)

⚠️⚠️⚠️ ABSOLUTE REQUIREMENT - YOU MUST FOLLOW THIS ⚠️⚠️⚠️
In the Market Analysis section, you MUST copy the EXACT addresses and prices from the Historic Property Sales data provided below.
DO NOT INVENT, FABRICATE, OR MAKE UP ANY ADDRESSES OR SALE PRICES.
DO NOT use placeholder addresses like "21 Example St" or "nearby property" or "a similar 3-bedroom property".
EVERY address you cite MUST be copied CHARACTER-FOR-CHARACTER from the data below.`;
    }

    const systemPrompt = `You are an expert Australian property valuer with expertise in assessing property condition and build quality from photos.
${valuationConstraints}

${valuationAnchor}

═══════════════════════════════════════════════════════════════
HISTORIC PROPERTY SALES DATA - USE THESE EXACT ADDRESSES:
═══════════════════════════════════════════════════════════════
${topComparablesText || 'No comparable sales data available.'}
═══════════════════════════════════════════════════════════════

${comparablesTemplate}

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

Use your visual assessment to ADJUST the valuation up or down from the comparable sale prices:
- Premium finishes/recent renovation: +5-10% above comparable average
- Good condition, modern: at comparable average
- Dated but well-maintained: -5-10% below comparable average
- Poor condition/needs work: -10-15% below comparable average
` : ''}

FORMAT YOUR REPORT AS FOLLOWS:

## 1. Property Overview
Brief description of the subject property.

${property.images && property.images.length > 0 ? `## 2. Visual Assessment
Detailed analysis of photos - build quality, condition, finishes, presentation.

## 3. Market Analysis
**Comparable Sales Data:**
[COPY THE TEMPLATE ABOVE - LIST ALL ${topComparables.length} PROPERTIES WITH THEIR EXACT ADDRESSES]

## 4. RP Data & Additional Report Insights
${hasRpData ? `**REQUIRED:** Extract and quote the following from the RP DATA PROPERTY REPORT provided above:
- Estimated Value Range (e.g., "$1,450,000 - $1,580,000")
- Land Value and Improvements Value if shown
- Any Capital Value (CV) or Rateable Value (RV)
- Previous sales history

DO NOT say "No RP Data insights provided" - the report IS provided above with ═══ borders.` : '(No RP Data report was provided for this property)'}

${hasRpData && usingReportsAsPrimary ? `## 5. Estimated Value Range
Simply state the RP Data estimated value range. DO NOT do a separate valuation assessment with adjustments.
Example: "Based on the RP Data Report, the estimated value range is $1,450,000 - $1,580,000"

## 6. Key Factors Affecting Value` : `## 5. Valuation Assessment
Explain step-by-step how you derived the value:
- Start with the most relevant comparable sale price
- Show each adjustment (land size, time, quality) with dollar amounts
- Explain why your final value is higher/lower than comparables

## 6. Estimated Value Range
Provide specific $ figures BASED ON THE COMPARABLE SALES DATA.
Your estimate MUST be justified by the comparables - if the best match sold for $X, explain why you are valuing above/below $X.
Remember: Maximum reasonable value is ${formatPrice(maxReasonableValue)} (highest comparable + 15%).

## 7. Key Factors Affecting Value`}` : `## 2. Market Analysis
**Comparable Sales Data:**
[COPY THE TEMPLATE ABOVE - LIST ALL ${topComparables.length} PROPERTIES WITH THEIR EXACT ADDRESSES]

## 3. RP Data & Additional Report Insights
${hasRpData ? `**REQUIRED:** Extract and quote the following from the RP DATA PROPERTY REPORT provided above:
- Estimated Value Range (e.g., "$1,450,000 - $1,580,000")
- Land Value and Improvements Value if shown
- Any Capital Value (CV) or Rateable Value (RV)
- Previous sales history

DO NOT say "No RP Data insights provided" - the report IS provided above with ═══ borders.` : '(No RP Data report was provided for this property)'}

${hasRpData && usingReportsAsPrimary ? `## 4. Estimated Value Range
Simply state the RP Data estimated value range. DO NOT do a separate valuation assessment with adjustments.
Example: "Based on the RP Data Report, the estimated value range is $1,450,000 - $1,580,000"

## 5. Key Factors Affecting Value` : `## 4. Valuation Assessment
Explain step-by-step how you derived the value:
- Start with the most relevant comparable sale price
- Show each adjustment (land size, time, quality) with dollar amounts
- Explain why your final value is higher/lower than comparables

## 5. Estimated Value Range
Provide specific $ figures BASED ON THE COMPARABLE SALES DATA.
Your estimate MUST be justified by the comparables - if the best match sold for $X, explain why you are valuing above/below $X.
Remember: Maximum reasonable value is highest comparable + 15%.

## 6. Key Factors Affecting Value`}`}

⚠️ CRITICAL REMINDER: Your Market Analysis section MUST include the EXACT addresses from the Historic Property Sales Data above. If you cannot find the data, state "Data unavailable" - NEVER invent addresses.`;

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
