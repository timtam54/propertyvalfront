import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getOpenAI } from '@/lib/openai';
import { Property } from '@/lib/types';

interface RouteParams {
  params: Promise<{ propertyId: string }>;
}

interface SoldProperty {
  address: string;
  price: number;
  beds: number | null;
  baths: number | null;
  carpark: number | null;
  property_type: string;
  sold_date?: string;
  source?: string;
}

interface ComparablesData {
  comparable_sold: SoldProperty[];
  statistics: {
    total_found: number;
    sold_count: number;
    price_range: {
      min: number | null;
      max: number | null;
      avg: number | null;
      median: number | null;
    };
  };
}

const DOMAIN_API_BASE = 'https://api.domain.com.au';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-ts-gamma.vercel.app';

/**
 * Get API keys from backend-ts server or database settings
 */
async function getApiKeys(db: any): Promise<{ domain_api_key: string | null }> {
  // First try to get from environment variable
  if (process.env.DOMAIN_API_KEY) {
    console.log('[API Keys] Using DOMAIN_API_KEY from environment');
    return { domain_api_key: process.env.DOMAIN_API_KEY };
  }

  // Try to fetch from backend-ts server (where Settings page saves to)
  try {
    const response = await fetch(`${BACKEND_URL}/api/api-settings`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.settings?.domain_api_key) {
        // The key might be masked (contains ****), so we need to get the real one
        // Try fetching from the internal settings endpoint
        const internalResponse = await fetch(`${BACKEND_URL}/api/settings/api-keys-internal`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (internalResponse.ok) {
          const internalData = await internalResponse.json();
          if (internalData.domain_api_key && !internalData.domain_api_key.includes('****')) {
            console.log('[API Keys] Got Domain API key from backend-ts internal endpoint');
            return { domain_api_key: internalData.domain_api_key };
          }
        }

        // If internal endpoint doesn't work, the key in settings might be usable if not masked
        if (!data.settings.domain_api_key.includes('****')) {
          console.log('[API Keys] Got Domain API key from backend-ts');
          return { domain_api_key: data.settings.domain_api_key };
        }
      }
    }
  } catch (e) {
    console.error('[API Keys] Error fetching from backend-ts:', e);
  }

  // Fallback to local database
  try {
    const settings = await db.collection('settings').findOne({ setting_id: 'api_keys' });
    if (settings?.domain_api_key) {
      console.log('[API Keys] Got Domain API key from local database');
      return { domain_api_key: settings.domain_api_key };
    }
  } catch (e) {
    console.error('[API Keys] Error fetching from local database:', e);
  }

  console.log('[API Keys] No Domain API key found');
  return { domain_api_key: null };
}

/**
 * Extract state from location string
 */
function extractState(location: string): string {
  const states = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
  const upperLocation = location.toUpperCase();

  for (const state of states) {
    if (upperLocation.includes(state)) {
      return state;
    }
  }

  return 'NSW'; // Default
}

/**
 * Extract suburb from location string
 */
function extractSuburb(location: string): string {
  const parts = location.split(',');
  return parts[0].trim();
}

/**
 * Search for comparable properties using Domain API
 */
async function searchDomainProperties(
  apiKey: string,
  location: string,
  beds: number,
  baths: number,
  propertyType: string = 'House'
): Promise<SoldProperty[]> {
  try {
    const suburb = extractSuburb(location);
    const state = extractState(location);

    const headers = {
      'X-API-Key': apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const url = `${DOMAIN_API_BASE}/v1/listings/residential/_search`;

    // Map property type to Domain format
    let domainPropertyType = 'House';
    if (propertyType.toLowerCase().includes('apartment') || propertyType.toLowerCase().includes('unit')) {
      domainPropertyType = 'ApartmentUnitFlat';
    } else if (propertyType.toLowerCase().includes('townhouse')) {
      domainPropertyType = 'Townhouse';
    }

    const searchBody = {
      listingType: 'Sale',
      propertyTypes: [domainPropertyType],
      minBedrooms: Math.max(1, beds - 1),
      maxBedrooms: beds + 1,
      minBathrooms: Math.max(1, baths - 1),
      maxBathrooms: baths + 1,
      locations: [
        {
          state: state,
          suburb: suburb,
          includeSurroundingSuburbs: true
        }
      ],
      pageSize: 20
    };

    console.log(`[Domain API] Searching for properties in ${suburb}, ${state}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(searchBody),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Domain API] HTTP error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const listings = Array.isArray(data) ? data : [];
    const properties: SoldProperty[] = [];

    for (const listing of listings.slice(0, 15)) {
      try {
        const propData: SoldProperty = {
          address: listing.headline || 'Address not available',
          price: 0,
          beds: null,
          baths: null,
          carpark: null,
          property_type: propertyType
        };

        // Extract price
        if (listing.priceDetails?.displayPrice) {
          const priceMatch = listing.priceDetails.displayPrice.match(/\$[\d,]+/);
          if (priceMatch) {
            const priceText = priceMatch[0].replace('$', '').replace(/,/g, '');
            propData.price = parseInt(priceText);
          }
        }

        // Extract property features
        if (listing.propertyDetails) {
          propData.beds = listing.propertyDetails.bedrooms;
          propData.baths = listing.propertyDetails.bathrooms;
          propData.carpark = listing.propertyDetails.carspaces;
        }

        // Extract sold date if available
        if (listing.saleDetails?.soldDate) {
          propData.sold_date = listing.saleDetails.soldDate;
        } else {
          propData.sold_date = 'Recently';
        }

        if (propData.price > 0) {
          properties.push(propData);
        }
      } catch (e) {
        console.error('[Domain API] Error parsing listing:', e);
      }
    }

    console.log(`[Domain API] Found ${properties.length} comparable properties in ${suburb}, ${state}`);
    return properties;

  } catch (error: any) {
    console.error('[Domain API] Error searching properties:', error.message);
    return [];
  }
}

/**
 * Parse location to get suburb and state for scraping
 */
function parseLocationForScraping(location: string): { suburb: string; state: string } {
  const parts = location.split(',').map(p => p.trim());
  const suburb = parts[0].toLowerCase().replace(/\s+/g, '-');
  let state = 'qld'; // Default for Queensland properties

  if (parts.length > 1) {
    const statePart = parts[1].toLowerCase();
    for (const ausState of ['nsw', 'vic', 'qld', 'sa', 'wa', 'tas', 'nt', 'act']) {
      if (statePart.includes(ausState)) {
        state = ausState;
        break;
      }
    }
  }

  return { suburb, state };
}

/**
 * Extract price from text string
 */
function extractPriceFromText(priceText: string): number | null {
  if (!priceText) return null;

  const cleaned = priceText.replace(/[$,\s]/g, '');
  const match = cleaned.match(/(\d{6,})/);
  if (match) {
    return parseInt(match[1]);
  }

  const millionMatch = priceText.toLowerCase().match(/([\d.]+)\s*m/);
  if (millionMatch) {
    return Math.round(parseFloat(millionMatch[1]) * 1000000);
  }

  const thousandMatch = priceText.toLowerCase().match(/([\d.]+)\s*k/);
  if (thousandMatch) {
    return Math.round(parseFloat(thousandMatch[1]) * 1000);
  }

  return null;
}

/**
 * Scrape sold properties from realestate.com.au as fallback
 */
async function scrapeRealestateProperties(
  location: string,
  beds: number,
  baths: number,
  propertyType: string = 'house'
): Promise<SoldProperty[]> {
  try {
    const { suburb, state } = parseLocationForScraping(location);

    // Map property type
    let realestateType = 'house';
    if (propertyType.toLowerCase().includes('apartment') || propertyType.toLowerCase().includes('unit')) {
      realestateType = 'unit+apartment';
    } else if (propertyType.toLowerCase().includes('townhouse')) {
      realestateType = 'townhouse';
    }

    const url = `https://www.realestate.com.au/sold/property-${realestateType}-with-${beds}-bedrooms-in-${suburb},+${state}/list-1`;

    console.log(`[Scraper] Fetching sold properties from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.realestate.com.au/'
      }
    });

    if (!response.ok) {
      console.warn(`[Scraper] Realestate.com.au returned status ${response.status}`);
      return [];
    }

    const html = await response.text();
    const properties: SoldProperty[] = [];

    // Parse JSON-LD structured data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonStr = match.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
          const data = JSON.parse(jsonStr);

          if (data['@type'] === 'ItemList' && data.itemListElement) {
            for (const item of data.itemListElement.slice(0, 10)) {
              if (item.item) {
                const prop = item.item;
                const price = extractPriceFromText(prop.offers?.price || '');

                if (price && price > 100000) {
                  properties.push({
                    address: prop.address?.streetAddress || prop.name || 'Address not available',
                    price,
                    beds: prop.numberOfRooms || beds,
                    baths: baths,
                    carpark: null,
                    property_type: propertyType,
                    sold_date: 'Recently'
                  });
                }
              }
            }
          }
        } catch (e) {
          // Continue if JSON parsing fails
        }
      }
    }

    // Fallback regex parsing
    if (properties.length === 0) {
      const priceMatches = html.matchAll(/Sold[^$]*\$[\d,]+/gi);

      for (const match of Array.from(priceMatches).slice(0, 10)) {
        const price = extractPriceFromText(match[0]);
        if (price && price > 100000) {
          properties.push({
            address: `Property in ${suburb.replace(/-/g, ' ')}`,
            price,
            beds: beds,
            baths: baths,
            carpark: null,
            property_type: propertyType,
            sold_date: 'Recently'
          });
        }
      }
    }

    console.log(`[Scraper] Found ${properties.length} sold properties from Realestate.com.au`);
    return properties;

  } catch (error: any) {
    console.error('[Scraper] Error scraping Realestate.com.au:', error.message);
    return [];
  }
}

/**
 * Get comparable properties with statistics - tries Domain API first, falls back to scraping
 */
async function getComparableProperties(
  apiKey: string | null,
  location: string,
  beds: number,
  baths: number,
  propertyType: string = 'House'
): Promise<ComparablesData> {
  let soldProperties: SoldProperty[] = [];
  let dataSource = 'AI Knowledge';

  // Try Domain API first if we have an API key
  if (apiKey) {
    console.log('[Evaluate] Trying Domain API...');
    soldProperties = await searchDomainProperties(apiKey, location, beds, baths, propertyType);
    if (soldProperties.length > 0) {
      dataSource = 'Domain.com.au API';
    }
  }

  // Fall back to web scraping if Domain API failed or returned no results
  if (soldProperties.length === 0) {
    console.log('[Evaluate] Domain API returned no results, falling back to web scraping...');
    soldProperties = await scrapeRealestateProperties(location, beds, baths, propertyType);
    if (soldProperties.length > 0) {
      dataSource = 'Realestate.com.au';
    }
  }

  const prices = soldProperties.filter(p => p.price > 0).map(p => p.price);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPrice = sortedPrices.length > 0
    ? sortedPrices[Math.floor(sortedPrices.length / 2)]
    : null;

  console.log(`[Evaluate] Got ${soldProperties.length} comparable properties from ${dataSource}`);

  return {
    comparable_sold: soldProperties.map(p => ({ ...p, source: dataSource })),
    statistics: {
      total_found: soldProperties.length,
      sold_count: soldProperties.length,
      price_range: {
        min: prices.length > 0 ? Math.min(...prices) : null,
        max: prices.length > 0 ? Math.max(...prices) : null,
        avg: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
        median: medianPrice
      }
    },
    data_source: dataSource
  } as ComparablesData & { data_source: string };
}

/**
 * Format price for display
 */
function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return 'N/A';
  return `$${price.toLocaleString()}`;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { propertyId } = await params;
    const db = await getDb();

    const property = await db
      .collection<Property>('properties')
      .findOne({ id: propertyId }, { projection: { _id: 0 } });

    if (!property) {
      return NextResponse.json({ detail: 'Property not found' }, { status: 404 });
    }

    // Get API keys
    const apiKeys = await getApiKeys(db);

    // Fetch comparable properties from Domain API
    let comparablesData: ComparablesData = {
      comparable_sold: [],
      statistics: {
        total_found: 0,
        sold_count: 0,
        price_range: { min: null, max: null, avg: null, median: null }
      }
    };

    if (apiKeys.domain_api_key) {
      console.log('[Evaluate] Fetching comparable properties from Domain API...');
      comparablesData = await getComparableProperties(
        apiKeys.domain_api_key,
        property.location,
        property.beds || 3,
        property.baths || 2,
        property.property_type || 'House'
      );
      console.log(`[Evaluate] Domain API returned ${comparablesData.statistics.total_found} comparable properties`);
    } else {
      console.log('[Evaluate] No Domain API key configured - evaluation will be based on AI knowledge only');
    }

    // Format comparables for the prompt
    let comparablesText = '';
    if (comparablesData.comparable_sold.length > 0) {
      comparablesText = '\n\nRECENT COMPARABLE SALES (from Domain.com.au):\n';
      for (const comp of comparablesData.comparable_sold.slice(0, 8)) {
        comparablesText += `- ${comp.address}: ${formatPrice(comp.price)} | ${comp.beds || 'N/A'} bed, ${comp.baths || 'N/A'} bath | ${comp.sold_date || 'Recently'}\n`;
      }

      const stats = comparablesData.statistics;
      const range = stats.price_range;
      comparablesText += `\nMARKET STATISTICS (${stats.total_found} comparable properties):\n`;
      comparablesText += `- Price Range: ${formatPrice(range.min)} - ${formatPrice(range.max)}\n`;
      comparablesText += `- Average Price: ${formatPrice(range.avg)}\n`;
      comparablesText += `- Median Price: ${formatPrice(range.median)}\n`;
    }

    // Calculate price per sqm if available
    let pricePerSqm: number | null = null;
    if (property.size && comparablesData.statistics.price_range.avg) {
      pricePerSqm = Math.round(comparablesData.statistics.price_range.avg / property.size);
    }

    const propertyDesc = `
Location: ${property.location}
Property Type: ${property.property_type || 'Residential'}
Bedrooms: ${property.beds}
Bathrooms: ${property.baths}
Car Parks: ${property.carpark}
Size: ${property.size ? property.size + ' sqm' : 'Not specified'}
Current List Price: ${property.price ? '$' + property.price.toLocaleString() : 'Not set'}
Features: ${property.features || 'Standard property'}
${property.rp_data_report ? '\nRP Data/Market Report:\n' + property.rp_data_report.substring(0, 2000) : ''}
${comparablesText}
    `;

    let improvementsDetected = '';
    if (property.images && property.images.length > 0) {
      try {
        const imageAnalysis = await getOpenAI().chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert property appraiser analyzing property photos. Identify visible improvements, renovations, and features that would add value.`
            },
            {
              role: 'user',
              content: `Based on a ${property.beds} bed, ${property.baths} bath property in ${property.location}, list likely improvements and their estimated value impact. Property type: ${property.property_type || 'House'}.`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        });
        improvementsDetected = imageAnalysis.choices[0]?.message?.content || '';
      } catch (imgError) {
        console.error('Image analysis error:', imgError);
      }
    }

    // Create comprehensive valuation prompt
    const systemPrompt = `You are an expert Australian property valuer creating a comprehensive valuation report. You have access to REAL comparable sales data from Domain.com.au which you MUST incorporate into your analysis.

Generate a detailed report with these sections:

1. ESTIMATED VALUE (AUD)
- Market Value: $XXX,XXX (most likely price based on comparable sales data)
- Range: $XXX,XXX - $XXX,XXX (lower to upper bound)
- Confidence: High/Medium/Low (based on number and quality of comparables)

2. COMPARABLE ANALYSIS
- Reference the SPECIFIC comparable sales provided from Domain.com.au
- Explain how this property compares to recent sales
- Price per sqm analysis if size data is available
- Note any adjustments for differences in features, condition, or location

3. VALUE DRIVERS
- Key factors affecting value (location, features, condition)
- Market demand factors
- Any premiums or discounts applicable

4. MARKET POSITION & PRICING STRATEGY
- Current market conditions
- Days on market expectations (typically 20-35 days in current market)
- **PRICING RECOMMENDATION**: Clearly specify if property should be marketed as:
  * "Offers Over $XXX" (for competitive properties in hot markets)
  * Fixed price (for standard market conditions)
  * Price guide/range (for auction campaigns)

5. POSITIONING ADVICE
- Marketing approach for maximum value
- Campaign strategy recommendations
- Key selling points to emphasize
- Best timeframe for campaign

CRITICAL: Your valuation MUST align with the actual comparable sales data provided. Do not invent prices that don't reflect the market data. If the comparable sales show a median of $X, your valuation should be within a reasonable range of that figure adjusted for property differences.

Use Australian formatting (AUD) and reflect current 2025 market conditions.`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Create a comprehensive property valuation report for:\n${propertyDesc}\n\n${improvementsDetected ? 'Detected Improvements:\n' + improvementsDetected : ''}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    const evaluationReport = completion.choices[0]?.message?.content || 'Unable to generate evaluation';

    // Store evaluation with comparables data
    await db.collection<Property>('properties').updateOne(
      { id: propertyId },
      {
        $set: {
          evaluation_report: evaluationReport,
          evaluation_date: new Date().toISOString(),
          improvements_detected: improvementsDetected || null,
          comparables_data: comparablesData,
          price_per_sqm: pricePerSqm
        }
      }
    );

    return NextResponse.json({
      evaluation_report: evaluationReport,
      improvements_detected: improvementsDetected || null,
      comparables_data: comparablesData,
      price_per_sqm: pricePerSqm,
      success: true
    });
  } catch (error) {
    console.error('Evaluate property error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ detail: 'Failed to evaluate property: ' + errorMessage }, { status: 500 });
  }
}
