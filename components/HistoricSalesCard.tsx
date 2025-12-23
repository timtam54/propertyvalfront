'use client';

import { useState, useEffect, useRef } from 'react';
import { Bed, Bath, Car, Ruler, Home, Loader2, MapPin, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { HistoricSalesWeights } from '@/lib/types';

// Declare google maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

interface HistoricSale {
  id: string;
  address: string;
  price: number;
  beds: number | null;
  baths: number | null;
  cars: number | null;
  land_area: number | null;
  property_type: string;
  sold_date: string;
  sold_date_raw?: string | Date | null;
  latitude?: number | null;
  longitude?: number | null;
  homely_url?: string | null;
  source_suburb?: string;
  is_neighbouring?: boolean;
}

interface HistoricSalesCardProps {
  propertyId: string;
  propertyLocation: string;
  propertyType?: string | null;
  propertyBeds: number;
  propertyBaths: number;
  propertyLandArea?: number | null; // Land area in sqm
  propertyLatitude?: number | null;
  propertyLongitude?: number | null;
  // Optional: pass pre-fetched data
  initialSales?: HistoricSale[];
  initialInfo?: {
    suburb: string;
    state: string;
    postcode: string | null;
    propertyType?: string;
    searchedAt?: string | null;
    cached?: boolean;
    scrapedUrl?: string | null;
    debug?: string | null;
    neighbouringSuburb?: {
      suburb: string;
      state: string;
      postcode: string | null;
      scrapedUrl: string;
    } | null;
  } | null;
  // Styling variant
  variant?: 'purple' | 'default';
  // Max items to show
  maxItems?: number;
  // Show source link
  showSourceLink?: boolean;
  // Callback to expose processed sales data (with similarity scores)
  onSalesProcessed?: (processedSales: Array<{
    id: string;
    address: string;
    price: number;
    beds: number | null;
    baths: number | null;
    cars: number | null;
    land_area: number | null;
    property_type: string;
    sold_date: string;
    sold_date_raw?: string | Date | null;
    similarity: number;
    distance: number | null;
    latitude?: number | null;
    longitude?: number | null;
  }>) => void;
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

  return R * c; // Distance in km
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Detect property density type from address pattern
 * house = full block, subdivision = 1/X or 2/X (half block), unit = 3+/X (shared block)
 */
function getDensityType(address: string, propertyType?: string | null): 'house' | 'subdivision' | 'unit' {
  const addr = (address || '').trim();
  const slashMatch = addr.match(/^(\d+)\/(\d+)/);
  if (slashMatch) {
    const unitNum = parseInt(slashMatch[1]);
    if (unitNum <= 2) return 'subdivision';
    return 'unit';
  }
  if (/^(unit|apt|apartment|suite|flat)\s+\d+/i.test(addr)) return 'unit';
  if (propertyType) {
    const pt = propertyType.toLowerCase();
    if (['unit', 'apartment', 'flat'].some(t => pt.includes(t))) return 'unit';
    if (['townhouse', 'villa', 'duplex', 'semi'].some(t => pt.includes(t))) return 'subdivision';
  }
  return 'house';
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export default function HistoricSalesCard({
  propertyId,
  propertyLocation,
  propertyType,
  propertyBeds,
  propertyBaths,
  propertyLandArea,
  propertyLatitude,
  propertyLongitude,
  initialSales,
  initialInfo,
  variant = 'purple',
  maxItems = 20,
  showSourceLink = true,
  onSalesProcessed,
}: HistoricSalesCardProps) {
  const [sales, setSales] = useState<HistoricSale[]>(initialSales || []);
  const [loading, setLoading] = useState(!initialSales);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState(initialInfo || null);
  const [hasFetched, setHasFetched] = useState(!!initialSales);
  const [sortBy, setSortBy] = useState<'match' | 'distance' | 'beds' | 'baths' | 'size' | 'recent'>('match');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [weights, setWeights] = useState<HistoricSalesWeights | null>(null);
  const [weightsLoaded, setWeightsLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Fetch weights configuration from API
  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const response = await fetch('/api/historic-sales-weights');
        if (response.ok) {
          const data = await response.json();
          setWeights(data);
        }
      } catch (err) {
        console.error('Error fetching weights configuration:', err);
        // Will use default hardcoded values if fetch fails
      } finally {
        setWeightsLoaded(true);
      }
    };
    fetchWeights();
  }, []);

  // Auto-fetch on mount if no initial data provided
  useEffect(() => {
    if (!hasFetched && propertyId) {
      fetchHistoricSales();
    }
  }, [propertyId]);

  const fetchHistoricSales = async (forceFresh: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      // Also refresh weights when forcing fresh data
      if (forceFresh) {
        try {
          const weightsResponse = await fetch('/api/historic-sales-weights');
          if (weightsResponse.ok) {
            const weightsData = await weightsResponse.json();
            setWeights(weightsData);
          }
        } catch (err) {
          console.error('Error refreshing weights:', err);
        }
      }

      const url = `/api/properties/${propertyId}/historic-sales${forceFresh ? '?fresh=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch historic sales');
      }
      setSales(data.sales || []);
      setInfo({
        suburb: data.suburb,
        state: data.state,
        postcode: data.postcode,
        propertyType: data.propertyType || 'all',
        searchedAt: data.searchedAt || null,
        cached: data.cached || false,
        scrapedUrl: data.scrapedUrl || null,
        debug: data.debug || null,
        neighbouringSuburb: data.neighbouringSuburb || null,
      });
      setHasFetched(true);

      // Show toast with data source info
      const salesCount = data.sales?.length || 0;
      if (data.cached) {
        toast.success(`Loaded ${salesCount} properties from database cache`);
      } else {
        toast.success(`Scraped ${salesCount} properties fresh from Homely.com.au`);
      }
    } catch (err: any) {
      console.error('Error fetching historic sales:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Process sales with similarity score and distance using configurable weights
  const processedSales = sales.map((sale) => {
    // Use weights from API or fall back to defaults
    // Distance is heavily weighted - location is the most important factor for comparable properties
    // A property 0m away (same building) is far more comparable than one 400m away, regardless of sale date
    // Recency has lower weight - a sale from 3 weeks ago vs 6 weeks ago has minimal price impact
    const w = weights || {
      bedroom_exact_match_bonus: 10,  // Bonus for matching bedrooms
      bedroom_diff_penalty_per_bed: 15,
      bathroom_exact_match_bonus: 5,  // Bonus for matching bathrooms
      bathroom_diff_penalty_per_bath: 10,
      density_house_to_unit_penalty: 40,
      density_house_to_subdivision_penalty: 20,
      // Distance weights - HEAVILY weighted because location is critical
      distance_same_building_bonus: 70,    // Same building (0m) - massive bonus
      distance_same_building_threshold_km: 0.02, // 20m - truly same building
      distance_ultra_close_bonus: 55,      // Same street/complex - huge bonus
      distance_ultra_close_threshold_km: 0.1, // 100m
      distance_very_close_bonus: 40,       // Very close properties
      distance_very_close_threshold_km: 0.2,  // 200m
      distance_close_bonus: 25,            // Close properties
      distance_close_threshold_km: 0.35,   // 350m
      distance_moderate_bonus: 10,         // Moderate distance - small bonus
      distance_moderate_threshold_km: 0.5, // 500m
      distance_far_penalty: 20,            // Getting far - penalty starts
      distance_far_threshold_km: 1,        // 1km
      distance_very_far_penalty: 40,       // Very far - major penalty
      distance_very_far_threshold_km: 2,   // 2km
      // Recency weights - recent sales are more relevant
      recency_very_recent_bonus: 10,       // Sold in last 2 months
      recency_very_recent_threshold_months: 2,
      recency_recent_bonus: 5,             // Sold in last 4 months
      recency_recent_threshold_months: 4,
      recency_getting_old_penalty: 5,      // 9+ months old
      recency_getting_old_threshold_months: 9,
      recency_old_penalty: 10,             // 15+ months old
      recency_old_threshold_months: 15,
      recency_very_old_penalty: 20,        // 24+ months old
      recency_very_old_threshold_months: 24,
      // Land area matching - high weight because land size is critical for accurate comparisons
      land_area_weight: 30, // Max penalty/bonus for land area difference
      land_area_tolerance_percent: 20, // Within 20% is considered a good match
    };

    // Calculate similarity score using configurable weights
    const bedDiff = Math.abs(propertyBeds - (sale.beds || propertyBeds));
    const bathDiff = Math.abs(propertyBaths - (sale.baths || propertyBaths));

    // Start with base score of 50 - only truly matching properties should reach 100
    // Distance and other factors add or subtract from this base
    let similarity = 50;

    // Apply bedroom scoring
    if (bedDiff === 0) {
      similarity += w.bedroom_exact_match_bonus;
    } else {
      similarity -= bedDiff * w.bedroom_diff_penalty_per_bed;
    }

    // Apply bathroom scoring
    if (bathDiff === 0) {
      similarity += w.bathroom_exact_match_bonus;
    } else {
      similarity -= bathDiff * w.bathroom_diff_penalty_per_bath;
    }

    // Apply density type penalty
    const targetDensity = getDensityType(propertyLocation, propertyType);
    const saleDensity = getDensityType(sale.address, sale.property_type);

    if (targetDensity !== saleDensity) {
      if (
        (targetDensity === 'house' && saleDensity === 'unit') ||
        (targetDensity === 'unit' && saleDensity === 'house')
      ) {
        similarity -= w.density_house_to_unit_penalty; // Big mismatch
      } else {
        similarity -= w.density_house_to_subdivision_penalty; // Medium mismatch
      }
    }

    // Calculate distance if coordinates available
    let distance: number | null = null;
    if (
      propertyLatitude != null &&
      propertyLongitude != null &&
      sale.latitude != null &&
      sale.longitude != null
    ) {
      distance = calculateDistance(
        propertyLatitude,
        propertyLongitude,
        sale.latitude,
        sale.longitude
      );

      // Apply distance-based score adjustment using configurable thresholds
      // Distance is the most important factor - closer properties are always better comparables
      // Use defaults if new fields not present in API response
      const sameBuildingThreshold = w.distance_same_building_threshold_km ?? 0.02;
      const sameBuildingBonus = w.distance_same_building_bonus ?? 70;
      const moderateBonus = w.distance_moderate_bonus ?? 10;

      if (distance < sameBuildingThreshold) {
        // Same building (0-20m) - massive bonus
        similarity += sameBuildingBonus;
      } else if (distance < w.distance_ultra_close_threshold_km) {
        // Ultra close (20-100m) - huge bonus
        similarity += w.distance_ultra_close_bonus;
      } else if (distance < w.distance_very_close_threshold_km) {
        // Very close (100-200m) - large bonus
        similarity += w.distance_very_close_bonus;
      } else if (distance < w.distance_close_threshold_km) {
        // Close (200-350m) - good bonus
        similarity += w.distance_close_bonus;
      } else if (distance < w.distance_moderate_threshold_km) {
        // Moderate (350-500m) - small bonus
        similarity += moderateBonus;
      } else if (distance < w.distance_far_threshold_km) {
        // Getting far (500m-1km) - no bonus or penalty
        // No adjustment
      } else if (distance < w.distance_very_far_threshold_km) {
        // Far (1-2km) - penalty starts
        similarity -= w.distance_far_penalty;
      } else {
        // Very far (>2km) - major penalty
        similarity -= w.distance_very_far_penalty;
      }
    }

    // Calculate months since sale for recency scoring
    let monthsAgo: number | null = null;
    let saleDate: Date | null = null;

    if (sale.sold_date_raw) {
      saleDate = new Date(sale.sold_date_raw);
    } else if (sale.sold_date && sale.sold_date !== 'Recently') {
      // Try to parse the formatted sold_date string (e.g., "6 Nov 2023")
      const parsed = new Date(sale.sold_date);
      if (!isNaN(parsed.getTime())) {
        saleDate = parsed;
      }
    }

    if (saleDate && !isNaN(saleDate.getTime())) {
      const now = new Date();
      monthsAgo = (now.getFullYear() - saleDate.getFullYear()) * 12 +
                  (now.getMonth() - saleDate.getMonth());
    }

    // Apply recency-based score adjustment using configurable thresholds
    if (monthsAgo != null) {
      if (monthsAgo <= w.recency_very_recent_threshold_months) {
        // Very recent - bonus
        similarity += w.recency_very_recent_bonus;
      } else if (monthsAgo <= w.recency_recent_threshold_months) {
        // Recent - small bonus
        similarity += w.recency_recent_bonus;
      } else if (monthsAgo > w.recency_very_old_threshold_months) {
        // Very old - big penalty
        similarity -= w.recency_very_old_penalty;
      } else if (monthsAgo > w.recency_old_threshold_months) {
        // Old - medium penalty
        similarity -= w.recency_old_penalty;
      } else if (monthsAgo > w.recency_getting_old_threshold_months) {
        // Getting old - small penalty
        similarity -= w.recency_getting_old_penalty;
      }
      // Between recent and getting_old thresholds: no adjustment
    }

    // Apply land area scoring - this is critical for accurate comparisons
    // If both properties have land area, compare them
    let landAreaMatch = false;
    if (propertyLandArea && propertyLandArea > 0 && sale.land_area && sale.land_area > 0) {
      const landDiffPercent = Math.abs(propertyLandArea - sale.land_area) / propertyLandArea * 100;

      if (landDiffPercent <= w.land_area_tolerance_percent) {
        // Within tolerance - good match, small bonus
        similarity += w.land_area_weight * 0.3; // e.g., +9 points for 30 weight
        landAreaMatch = true;
      } else if (landDiffPercent <= w.land_area_tolerance_percent * 2) {
        // Slightly outside tolerance - small penalty
        similarity -= w.land_area_weight * 0.3;
      } else if (landDiffPercent <= w.land_area_tolerance_percent * 3) {
        // Moderately different - medium penalty
        similarity -= w.land_area_weight * 0.6;
      } else {
        // Very different land sizes - big penalty
        similarity -= w.land_area_weight;
      }
    } else if (sale.land_area && sale.land_area > 0 && (!propertyLandArea || propertyLandArea === 0)) {
      // Subject property has no land area but comparable does - can't penalize, but note it
      // No penalty applied
    } else if (propertyLandArea && propertyLandArea > 0 && (!sale.land_area || sale.land_area === 0)) {
      // Subject property has land area but comparable doesn't - small penalty for missing data
      similarity -= w.land_area_weight * 0.2;
    }

    // Clamp similarity to 0-100 range
    similarity = Math.max(0, Math.min(100, similarity));

    const isExactMatch =
      sale.beds === propertyBeds &&
      sale.baths === propertyBaths &&
      targetDensity === saleDensity &&
      (distance == null || distance < w.distance_moderate_threshold_km) && // Only exact match if within moderate distance
      (monthsAgo == null || monthsAgo <= w.recency_getting_old_threshold_months) && // Only exact match if sold recently
      (landAreaMatch || !propertyLandArea); // Only exact match if land area matches (or subject has no land area)

    return {
      ...sale,
      similarity,
      isExactMatch,
      densityType: saleDensity,
      distance,
      monthsAgo,
    };
  });

  // Sort based on selected criteria
  const sortedSales = [...processedSales]
    .sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          // Closest first (null distances go to end)
          if (a.distance == null && b.distance == null) return 0;
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        case 'beds':
          // Best bedroom match first (smallest difference)
          const aBedDiff = Math.abs(propertyBeds - (a.beds || 0));
          const bBedDiff = Math.abs(propertyBeds - (b.beds || 0));
          return aBedDiff - bBedDiff;
        case 'baths':
          // Best bathroom match first (smallest difference)
          const aBathDiff = Math.abs(propertyBaths - (a.baths || 0));
          const bBathDiff = Math.abs(propertyBaths - (b.baths || 0));
          return aBathDiff - bBathDiff;
        case 'size':
          // Largest land area first (null goes to end)
          if (!a.land_area && !b.land_area) return 0;
          if (!a.land_area) return 1;
          if (!b.land_area) return -1;
          return b.land_area - a.land_area;
        case 'recent':
          // Most recent first (null/unknown dates go to end)
          if (a.monthsAgo == null && b.monthsAgo == null) return 0;
          if (a.monthsAgo == null) return 1;
          if (b.monthsAgo == null) return -1;
          return a.monthsAgo - b.monthsAgo;
        case 'match':
        default:
          // Best overall match first, with distance as tiebreaker
          const simDiff = b.similarity - a.similarity;
          if (simDiff !== 0) return simDiff;
          // When similarity is equal, prefer closer properties
          if (a.distance == null && b.distance == null) return 0;
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
      }
    })
    .slice(0, maxItems);

  const sortOptions = [
    { value: 'match', label: 'Best Match' },
    { value: 'recent', label: 'Recent Sale' },
    { value: 'distance', label: 'Distance' },
    { value: 'beds', label: 'Bedrooms' },
    { value: 'baths', label: 'Bathrooms' },
    { value: 'size', label: 'Land Size' },
  ];

  // Copy sales data to clipboard as HTML for email
  const copyToClipboard = async () => {
    if (sortedSales.length === 0) {
      toast.error('No sales data to copy');
      return;
    }

    // Generate HTML table for email
    const htmlContent = `
<h3 style="font-family: Arial, sans-serif; color: #1f2937; margin-bottom: 16px;">
  Historic Property Sales - ${info?.suburb || 'Area'}, ${info?.state || ''} ${info?.postcode || ''}
</h3>
<p style="font-family: Arial, sans-serif; font-size: 14px; color: #6b7280; margin-bottom: 16px;">
  ${sortedSales.length} comparable properties found. Data sourced from Homely.com.au on ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}.
</p>
<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px;">
  <thead>
    <tr style="background-color: #f3f4f6;">
      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Address</th>
      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">Price</th>
      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">Beds</th>
      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">Baths</th>
      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">Cars</th>
      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left;">Sold Date</th>
      <th style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">Match</th>
    </tr>
  </thead>
  <tbody>
    ${sortedSales.map((sale, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="border: 1px solid #d1d5db; padding: 10px;">${sale.address}</td>
      <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right; font-weight: bold; color: #059669;">$${sale.price?.toLocaleString() || 'N/A'}</td>
      <td style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">${sale.beds || '-'}</td>
      <td style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">${sale.baths || '-'}</td>
      <td style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">${sale.cars || '-'}</td>
      <td style="border: 1px solid #d1d5db; padding: 10px;">${sale.sold_date}</td>
      <td style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">
        <span style="background-color: ${sale.similarity >= 80 ? '#dcfce7' : '#fee2e2'}; color: ${sale.similarity >= 80 ? '#166534' : '#991b1b'}; padding: 2px 8px; border-radius: 4px; font-weight: 600;">
          ${sale.similarity}%
        </span>
      </td>
    </tr>
    `).join('')}
  </tbody>
</table>
<p style="font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af; margin-top: 16px;">
  Source: Homely.com.au | Generated by PropertyVal
</p>
`;

    // Also generate plain text version
    const plainText = `Historic Property Sales - ${info?.suburb || 'Area'}, ${info?.state || ''} ${info?.postcode || ''}

${sortedSales.map((sale, index) =>
  `${index + 1}. ${sale.address}
   Price: $${sale.price?.toLocaleString() || 'N/A'}
   Specs: ${sale.beds || '-'} bed, ${sale.baths || '-'} bath, ${sale.cars || '-'} car
   Sold: ${sale.sold_date}
   Match: ${sale.similarity}%
`).join('\n')}

Source: Homely.com.au | Generated by PropertyVal
`;

    try {
      // Try to copy as HTML (for rich email clients)
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        // Fallback to plain text
        await navigator.clipboard.writeText(plainText);
      }

      setCopied(true);
      toast.success('Copied to clipboard! Paste into email.');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Call onSalesProcessed callback when processed sales data is ready
  // Must wait for weights to be loaded so similarity scores are calculated correctly
  const lastProcessedIdRef = useRef<string>('');
  useEffect(() => {
    if (!onSalesProcessed || processedSales.length === 0) return;

    // Wait until weights fetch is complete (either loaded or failed with defaults)
    // The processedSales calculation uses weights, so we need them to be ready
    if (!weightsLoaded) return; // Still loading weights

    // Create a stable ID from the processed sales data including similarity scores
    const processedId = processedSales.map(s => `${s.id}:${s.similarity}`).join(',');
    if (processedId === lastProcessedIdRef.current) return;
    lastProcessedIdRef.current = processedId;

    // Sort by similarity (best match first), with distance as tiebreaker
    // This MUST match the sorting used in the UI (sortedSales with sortBy='match')
    const sortedForCallback = [...processedSales]
      .sort((a, b) => {
        const simDiff = b.similarity - a.similarity;
        if (simDiff !== 0) return simDiff;
        // When similarity is equal, prefer closer properties
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      })
      .map(s => ({
        id: s.id,
        address: s.address,
        price: s.price,
        beds: s.beds,
        baths: s.baths,
        cars: s.cars,
        land_area: s.land_area,
        property_type: s.property_type,
        sold_date: s.sold_date,
        sold_date_raw: s.sold_date_raw,
        similarity: s.similarity,
        distance: s.distance,
        latitude: s.latitude,
        longitude: s.longitude,
      }));

    console.log(`[HistoricSalesCard] Passing ${sortedForCallback.length} processed sales to parent`);
    onSalesProcessed(sortedForCallback);
  }, [processedSales, weightsLoaded, onSalesProcessed]);

  // Initialize Google Map when viewMode changes to 'map'
  useEffect(() => {
    if (viewMode !== 'map' || !mapRef.current) return;

    // Wait for Google Maps to be loaded (loaded by main page Script component)
    const loadGoogleMaps = () => {
      return new Promise<void>((resolve) => {
        if (window.google?.maps) {
          resolve();
          return;
        }
        // Poll for Google Maps to be loaded (loaded by page's Script component)
        const checkInterval = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!window.google?.maps) {
            console.warn('Google Maps failed to load after 10 seconds');
          }
          resolve();
        }, 10000);
      });
    };

    const initMap = async () => {
      await loadGoogleMaps();

      if (!mapRef.current || !window.google?.maps) return;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Get properties with coordinates
      const propertiesWithCoords = sortedSales.filter(s => s.latitude && s.longitude);

      // Calculate center (use target property or average of sales)
      let centerLat = propertyLatitude || -19.26;
      let centerLng = propertyLongitude || 146.80;

      if (!propertyLatitude && propertiesWithCoords.length > 0) {
        centerLat = propertiesWithCoords.reduce((sum, p) => sum + (p.latitude || 0), 0) / propertiesWithCoords.length;
        centerLng = propertiesWithCoords.reduce((sum, p) => sum + (p.longitude || 0), 0) / propertiesWithCoords.length;
      }

      // Create map
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
      });
      mapInstanceRef.current = map;

      // Add marker for target property (blue)
      if (propertyLatitude && propertyLongitude) {
        const targetMarker = new google.maps.Marker({
          position: { lat: propertyLatitude, lng: propertyLongitude },
          map,
          title: 'Target Property',
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          },
          zIndex: 1000,
        });

        const targetInfo = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 200px;">
              <div style="font-weight: bold; color: #1e40af; margin-bottom: 4px;">📍 Target Property</div>
              <div style="font-size: 12px; color: #374151;">${propertyLocation}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${propertyBeds} bed, ${propertyBaths} bath</div>
            </div>
          `,
        });

        targetMarker.addListener('click', () => {
          targetInfo.open(map, targetMarker);
        });

        markersRef.current.push(targetMarker);
      }

      // Add markers for historic sales (green=good match, red=poor match, blue=neighbouring suburb)
      propertiesWithCoords.forEach((sale, index) => {
        const isGoodMatch = sale.similarity >= 80;
        // Use blue for neighbouring suburb, otherwise green/red based on match
        let markerUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
        if (sale.is_neighbouring) {
          markerUrl = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        } else if (isGoodMatch) {
          markerUrl = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
        }
        const marker = new google.maps.Marker({
          position: { lat: sale.latitude!, lng: sale.longitude! },
          map,
          title: sale.address,
          icon: {
            url: markerUrl,
          },
          label: {
            text: String(index + 1),
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
          },
        });

        const infoContent = `
          <div style="padding: 8px; max-width: 250px;">
            ${sale.is_neighbouring ? `<div style="margin-bottom: 4px;"><span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${sale.source_suburb || 'NEIGHBOURING'}</span></div>` : ''}
            <div style="font-weight: bold; color: #059669; font-size: 16px; margin-bottom: 4px;">$${sale.price?.toLocaleString()}</div>
            ${sale.homely_url
              ? `<a href="${sale.homely_url}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #2563eb; margin-bottom: 4px; display: block; text-decoration: underline;">${sale.address}</a>`
              : `<div style="font-size: 12px; color: #374151; margin-bottom: 4px;">${sale.address}</div>`
            }
            <div style="font-size: 11px; color: #6b7280;">
              ${sale.beds || '?'} bed, ${sale.baths || '?'} bath${sale.land_area ? `, ${sale.land_area}m²` : ''}
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Sold: ${sale.sold_date}</div>
            <div style="font-size: 11px; margin-top: 4px;">
              <span style="background: ${sale.similarity >= 80 ? '#dcfce7' : '#fee2e2'}; color: ${sale.similarity >= 80 ? '#166534' : '#991b1b'}; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                ${sale.similarity}% match
              </span>
              ${sale.distance != null ? (sale.homely_url
                ? `<a href="${sale.homely_url}" target="_blank" rel="noopener noreferrer" style="margin-left: 4px; color: #2563eb; text-decoration: underline;">📍 ${formatDistance(sale.distance)}</a>`
                : `<span style="margin-left: 4px; color: #2563eb;">📍 ${formatDistance(sale.distance)}</span>`) : ''}
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content: infoContent });
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers
      if (markersRef.current.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        markersRef.current.forEach(marker => {
          const pos = marker.getPosition();
          if (pos) bounds.extend(pos);
        });
        map.fitBounds(bounds);
      }
    };

    initMap();

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [viewMode, sortedSales, propertyLatitude, propertyLongitude, propertyLocation, propertyBeds, propertyBaths]);

  // Color scheme based on variant with dark mode support
  const colors = variant === 'purple' ? {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    headerBg: 'bg-purple-50 dark:bg-purple-900/20',
    title: 'text-purple-800 dark:text-purple-300',
    button: 'bg-purple-500 hover:bg-purple-600',
    itemHover: 'hover:border-purple-300 dark:hover:border-purple-600',
    link: 'text-purple-700 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300',
    badge: 'text-purple-600 dark:text-purple-400',
    counter: 'text-purple-600 dark:text-purple-400',
  } : {
    bg: 'bg-gray-50 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    headerBg: 'bg-gray-50 dark:bg-gray-800',
    title: 'text-gray-800 dark:text-gray-200',
    button: 'bg-blue-500 hover:bg-blue-600',
    itemHover: 'hover:border-gray-300 dark:hover:border-gray-600',
    link: 'text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300',
    badge: 'text-gray-600 dark:text-gray-400',
    counter: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className={`rounded-2xl shadow-sm border ${colors.border} p-6`}>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className={`text-lg font-bold ${colors.title} flex items-center gap-2`}>
            <span className="text-xl">🏠</span>
            Historic Property Sales
            {info && (
              <span className="text-sm font-normal text-gray-500">
                ({info.suburb}, {info.state} {info.postcode})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
            {/* Map/Table toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'map' : 'table')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors text-sm ${
                viewMode === 'map'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <MapPin size={16} />
              {viewMode === 'map' ? 'Table' : 'Map'}
            </button>
            {/* Copy button */}
            <button
              onClick={copyToClipboard}
              disabled={sortedSales.length === 0}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors text-sm ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
              } disabled:opacity-50`}
              title="Copy all sales data for email"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        {/* Refresh button on separate line */}
        <div className="flex justify-end">
          <button
            onClick={() => fetchHistoricSales(true)}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 ${colors.button} text-white rounded-lg font-semibold transition-colors text-sm disabled:opacity-50`}
            title="Refresh data from Homely (bypasses cache)"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Home size={16} />}
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Showing recent {propertyType?.toLowerCase() || 'property'} sales in{' '}
        <span className="font-medium">{info?.suburb || 'this area'}</span>
        {info?.neighbouringSuburb && (
          <span>
            {' '}and <span className="font-medium text-blue-600 dark:text-blue-400">{info.neighbouringSuburb.suburb}</span>
          </span>
        )}
        .
        {info?.searchedAt && (
          <span className="ml-1">
            Data {info.cached ? 'cached' : 'fetched'} on{' '}
            {new Date(info.searchedAt).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </span>
        )}
        {showSourceLink && info?.scrapedUrl && (
          <span className="ml-1">
            Source:{' '}
            <a
              href={info.scrapedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 underline hover:text-purple-800 dark:hover:text-purple-300"
            >
              Homely.com.au
            </a>
            {info?.neighbouringSuburb?.scrapedUrl && (
              <>
                {', '}
                <a
                  href={info.neighbouringSuburb.scrapedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {info.neighbouringSuburb.suburb}
                </a>
              </>
            )}
          </span>
        )}
      </p>

      {/* Content */}
      <div className={`${colors.bg} rounded-xl p-5 border ${colors.border}`}>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto mb-2" size={32} />
            <p className={colors.title}>Loading historic sales from Homely.com.au...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-600 font-semibold">Error loading sales data</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        ) : sortedSales.length === 0 ? (
          <div className="text-center py-4">
            <p className={`font-semibold ${colors.title} mb-2`}>No recent sales found</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
              No sold properties found in this area. Try clicking Refresh to fetch the latest data.
            </p>
            {info?.debug && (
              <details className="text-left mt-3 bg-white dark:bg-gray-700 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                <summary className="cursor-pointer text-sm font-semibold text-purple-700 dark:text-purple-400">
                  Debug Info
                </summary>
                <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all max-h-40 overflow-auto">
                  {info.debug}
                </pre>
              </details>
            )}
          </div>
        ) : viewMode === 'map' ? (
          /* Map View */
          <div>
            <div
              ref={mapRef}
              className="w-full h-96 rounded-lg border border-gray-300"
              style={{ minHeight: '400px' }}
            />
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Target Property
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Good Match (80%+)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Lower Match
              </span>
            </div>
            <p className={`text-center text-xs ${colors.counter} mt-2`}>
              {sortedSales.filter(s => s.latitude && s.longitude).length} of {sortedSales.length} properties shown on map
            </p>
          </div>
        ) : (
          /* Table View */
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sortedSales.map((sale, index) => (
              <div
                key={sale.id}
                className={`rounded-lg p-4 border transition-colors ${
                  sale.isExactMatch
                    ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 border-2'
                    : index === 0
                    ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-600 border-2'
                    : `bg-white dark:bg-gray-700 border-purple-100 dark:border-gray-600 ${colors.itemHover}`
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {sale.isExactMatch && (
                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                          EXACT MATCH
                        </span>
                      )}
                      {!sale.isExactMatch && index === 0 && (
                        <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                          BEST MATCH
                        </span>
                      )}
                      {sale.is_neighbouring && (
                        <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                          {sale.source_suburb || 'NEIGHBOURING'}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">{sale.similarity}% match</span>
                    </div>

                    {/* Address link - links to Homely if available, otherwise Google Maps */}
                    <a
                      href={sale.homely_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sale.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-semibold ${colors.link} hover:underline text-sm inline-flex items-center gap-1`}
                      title={sale.homely_url ? 'View on Homely' : 'View on Google Maps'}
                    >
                      {sale.address}
                      {sale.homely_url ? (
                        <Home size={12} className="opacity-50" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="opacity-50"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      )}
                    </a>

                    {/* Property details */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      {sale.beds && (
                        <span className="flex items-center gap-1">
                          <Bed size={12} /> {sale.beds}
                        </span>
                      )}
                      {sale.baths && (
                        <span className="flex items-center gap-1">
                          <Bath size={12} /> {sale.baths}
                        </span>
                      )}
                      {sale.cars && (
                        <span className="flex items-center gap-1">
                          <Car size={12} /> {sale.cars}
                        </span>
                      )}
                      {sale.land_area && (
                        <span className="flex items-center gap-1">
                          <Ruler size={12} /> {sale.land_area} m²
                        </span>
                      )}
                      <span className={colors.badge}>{sale.property_type}</span>
                    </div>
                  </div>

                  {/* Price and Distance */}
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">${sale.price?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{sale.sold_date}</p>
                    {sale.distance != null && (
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                        📍 {formatDistance(sale.distance)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <p className={`text-center text-xs ${colors.counter} mt-2`}>
              {sortedSales.length} properties (sorted by {sortOptions.find(o => o.value === sortBy)?.label.toLowerCase()})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
