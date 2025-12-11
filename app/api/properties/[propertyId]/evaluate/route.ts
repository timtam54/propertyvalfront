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
 */
async function scrapeHomelyProperties(suburb: string, state: string, postcode: string | null, propertyType: string | null): Promise<SoldProperty[]> {
  let url = postcode
    ? `https://www.homely.com.au/sold-properties/${suburb}-${state}-${postcode}`
    : `https://www.homely.com.au/sold-properties/${suburb}-${state}`;

  if (propertyType) {
    url += `?propertytype=${propertyType}`;
  }

  console.log(`[Evaluate] Scraping: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    });

    if (!response.ok) {
      console.log(`[Evaluate] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!nextDataMatch) {
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

    return properties;
  } catch (error: any) {
    console.log(`[Evaluate] Scrape error: ${error.message}`);
    return [];
  }
}

/**
 * Calculate similarity score between target property and comparable
 */
function calculateSimilarity(
  target: { beds: number; baths: number; land_area?: number | null },
  comparable: SoldProperty
): number {
  let score = 100;

  const bedDiff = Math.abs((target.beds || 3) - (comparable.beds || 3));
  score -= bedDiff * 15;

  const bathDiff = Math.abs((target.baths || 2) - (comparable.baths || 2));
  score -= bathDiff * 10;

  if (target.land_area && comparable.land_area) {
    const areaDiffPercent = Math.abs(target.land_area - comparable.land_area) / target.land_area;
    score -= Math.min(areaDiffPercent * 50, 30);
  }

  return Math.max(0, score);
}

/**
 * Find best matching comparable properties
 */
function findBestComparables(
  targetProperty: Property,
  soldProperties: SoldProperty[],
  limit: number = 10
): SoldProperty[] {
  const target = {
    beds: targetProperty.beds || 3,
    baths: targetProperty.baths || 2,
    land_area: targetProperty.size || null
  };

  const scored = soldProperties.map(prop => ({
    ...prop,
    similarity_score: calculateSimilarity(target, prop)
  }));

  scored.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

  return scored.slice(0, limit);
}

/**
 * Calculate statistics from comparable properties
 */
function calculateStatistics(properties: SoldProperty[]) {
  const prices = properties.map(p => p.price).filter(p => p > 0);

  if (prices.length === 0) {
    return { min: null, max: null, avg: null, median: null };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg,
    median
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

    // Parse location
    const { suburb, state, postcode } = parseLocation(property.location);
    const propertyTypeFilter = property.property_type ? getPropertyTypeFilter(property.property_type) : null;
    console.log(`[Evaluate] Parsed: suburb=${suburb}, state=${state}, postcode=${postcode}, type=${propertyTypeFilter}`);

    // Scrape fresh sold properties from Homely (no caching)
    const soldProperties = await scrapeHomelyProperties(suburb, state, postcode, propertyTypeFilter);

    // Find best comparables
    const comparables = findBestComparables(property, soldProperties);
    console.log(`[Evaluate] Found ${comparables.length} comparable properties`);

    // Calculate statistics
    const stats = calculateStatistics(comparables);
    const dataSource = comparables.length > 0 ? 'Homely.com.au (live)' : 'AI Knowledge';

    // Build comparables text for AI prompt
    let comparablesText = '';
    if (comparables.length > 0) {
      comparablesText = `\n\nRECENT COMPARABLE SALES (from ${dataSource}):\n`;
      for (const comp of comparables.slice(0, 8)) {
        comparablesText += `- ${comp.address}: ${formatPrice(comp.price)} | ${comp.beds || 'N/A'} bed, ${comp.baths || 'N/A'} bath${comp.land_area ? ' | ' + comp.land_area + ' m²' : ''} | Sold: ${comp.sold_date} | Similarity: ${comp.similarity_score || 0}%\n`;
      }
      comparablesText += `\nMARKET STATISTICS (${comparables.length} comparable properties):\n`;
      comparablesText += `- Price Range: ${formatPrice(stats.min)} - ${formatPrice(stats.max)}\n`;
      comparablesText += `- Average Price: ${formatPrice(stats.avg)}\n`;
      comparablesText += `- Median Price: ${formatPrice(stats.median)}\n`;
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert Australian property valuer. Analyze the property and provide a professional valuation report.

Based on ALL the data provided (comparable sales, RP Data report, and any additional reports), estimate a fair market value range for this property.${dataSourcesNote}

Format your response as a clear, professional report with:
1. Property Overview
2. Market Analysis (using the comparable sales data)
3. RP Data & Additional Report Insights (if provided - extract key valuation data, land value, improvements value, previous sales, etc.)
4. Valuation Assessment (synthesizing all available data)
5. Estimated Value Range (provide specific $ figures based on all available data)
6. Key Factors Affecting Value

Be specific with dollar amounts. If RP Data or additional reports contain valuation figures, reference and reconcile them with the comparable sales data.`
        },
        {
          role: 'user',
          content: `Please provide a valuation report for this property:\n${propertyDesc}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2500
    });

    const evaluationReport = completion.choices[0]?.message?.content || 'Unable to generate evaluation.';

    // Calculate confidence scoring
    const confidenceScoring = calculateConfidenceScoring(comparables, property);

    // Prepare valuation history entry
    const estimatedValue = stats.median || stats.avg || 0;
    const valueRange = estimatedValue * 0.1;
    const valuationEntry: ValuationHistoryEntry = {
      date: new Date().toISOString(),
      estimated_value: estimatedValue,
      value_low: Math.round(estimatedValue - valueRange),
      value_high: Math.round(estimatedValue + valueRange),
      confidence_score: confidenceScoring.overall_score,
      confidence_level: confidenceScoring.level,
      data_source: dataSource,
      comparables_count: comparables.length,
      notes: `Based on ${comparables.length} comparable properties in ${suburb.replace(/-/g, ' ')}`
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
      selected: true
    }));

    const comparablesData = {
      comparable_sold: comparablesWithIds,
      statistics: {
        total_found: comparables.length,
        sold_count: comparables.length,
        price_range: stats
      },
      data_source: dataSource,
      domain_api_error: comparables.length === 0 ? `No sold properties found for ${suburb.replace(/-/g, ' ')}, ${state.toUpperCase()}${postcode ? ' ' + postcode : ''}` : null
    };

    // Save evaluation to backend
    try {
      await fetch(`${BACKEND_URL}/api/properties/${propertyId}/save-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_report: evaluationReport,
          comparables_data: comparablesData,
          confidence_scoring: confidenceScoring,
          valuation_entry: valuationEntry
        })
      });
    } catch (saveError) {
      console.log(`[Evaluate] Could not save to backend: ${saveError}`);
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
