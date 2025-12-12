'use client';

import { useState, useEffect, useRef } from 'react';
import { Bed, Bath, Car, Ruler, Home, Loader2, MapPin } from 'lucide-react';

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
  propertyLatitude,
  propertyLongitude,
  initialSales,
  initialInfo,
  variant = 'purple',
  maxItems = 20,
  showSourceLink = true,
}: HistoricSalesCardProps) {
  const [sales, setSales] = useState<HistoricSale[]>(initialSales || []);
  const [loading, setLoading] = useState(!initialSales);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState(initialInfo || null);
  const [hasFetched, setHasFetched] = useState(!!initialSales);
  const [sortBy, setSortBy] = useState<'match' | 'distance' | 'beds' | 'baths' | 'size' | 'recent'>('match');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Auto-fetch on mount if no initial data provided
  useEffect(() => {
    if (!hasFetched && propertyId) {
      fetchHistoricSales();
    }
  }, [propertyId]);

  const fetchHistoricSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/properties/${propertyId}/historic-sales`);
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
      });
      setHasFetched(true);
    } catch (err: any) {
      console.error('Error fetching historic sales:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Process sales with similarity score and distance
  const processedSales = sales.map((sale) => {
    // Calculate similarity score
    const bedDiff = Math.abs(propertyBeds - (sale.beds || propertyBeds));
    const bathDiff = Math.abs(propertyBaths - (sale.baths || propertyBaths));
    let similarity = Math.max(0, 100 - bedDiff * 25 - bathDiff * 20);

    // Apply density type penalty
    const targetDensity = getDensityType(propertyLocation, propertyType);
    const saleDensity = getDensityType(sale.address, sale.property_type);

    if (targetDensity !== saleDensity) {
      if (
        (targetDensity === 'house' && saleDensity === 'unit') ||
        (targetDensity === 'unit' && saleDensity === 'house')
      ) {
        similarity = Math.max(0, similarity - 40); // Big mismatch
      } else {
        similarity = Math.max(0, similarity - 20); // Medium mismatch
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

      // Apply distance-based score adjustment
      if (distance < 0.5) {
        // Very close (< 500m) - bonus
        similarity = Math.min(100, similarity + 10);
      } else if (distance < 1) {
        // Close (500m - 1km) - small bonus
        similarity = Math.min(100, similarity + 5);
      } else if (distance > 5) {
        // Very far (> 5km) - big penalty
        similarity = Math.max(0, similarity - 25);
      } else if (distance > 3) {
        // Far (3-5km) - medium penalty
        similarity = Math.max(0, similarity - 15);
      } else if (distance > 2) {
        // Moderate distance (2-3km) - small penalty
        similarity = Math.max(0, similarity - 8);
      }
      // 1-2km: no adjustment
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

    // Apply recency-based score adjustment
    if (monthsAgo != null) {
      if (monthsAgo <= 3) {
        // Very recent (0-3 months) - bonus
        similarity = Math.min(100, similarity + 10);
      } else if (monthsAgo <= 6) {
        // Recent (3-6 months) - small bonus
        similarity = Math.min(100, similarity + 5);
      } else if (monthsAgo > 24) {
        // Very old (> 2 years) - big penalty
        similarity = Math.max(0, similarity - 20);
      } else if (monthsAgo > 18) {
        // Old (18-24 months) - medium penalty
        similarity = Math.max(0, similarity - 10);
      } else if (monthsAgo > 12) {
        // Getting old (12-18 months) - small penalty
        similarity = Math.max(0, similarity - 5);
      }
      // 6-12 months: no adjustment
    }

    const isExactMatch =
      sale.beds === propertyBeds &&
      sale.baths === propertyBaths &&
      targetDensity === saleDensity &&
      (distance == null || distance < 2) && // Only exact match if within 2km
      (monthsAgo == null || monthsAgo <= 12); // Only exact match if sold within 12 months

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
          // Best overall match first
          return b.similarity - a.similarity;
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

  // Color scheme based on variant
  const colors = variant === 'purple' ? {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    headerBg: 'bg-purple-50',
    title: 'text-purple-800',
    button: 'bg-purple-500 hover:bg-purple-600',
    itemHover: 'hover:border-purple-300',
    link: 'text-purple-700 hover:text-purple-900',
    badge: 'text-purple-600',
    counter: 'text-purple-600',
  } : {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    headerBg: 'bg-gray-50',
    title: 'text-gray-800',
    button: 'bg-blue-500 hover:bg-blue-600',
    itemHover: 'hover:border-gray-300',
    link: 'text-blue-700 hover:text-blue-900',
    badge: 'text-gray-600',
    counter: 'text-gray-600',
  };

  return (
    <div className={`rounded-2xl shadow-sm border ${colors.border} p-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MapPin size={16} />
            {viewMode === 'map' ? 'Table' : 'Map'}
          </button>
          <button
            onClick={fetchHistoricSales}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 ${colors.button} text-white rounded-lg font-semibold transition-colors text-sm disabled:opacity-50`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Home size={16} />}
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-gray-500 mb-3">
        Showing recent {propertyType?.toLowerCase() || 'property'} sales in{' '}
        <span className="font-medium">{info?.suburb || 'this area'}</span>
        {info?.neighbouringSuburb && (
          <span>
            {' '}and <span className="font-medium text-blue-600">{info.neighbouringSuburb.suburb}</span>
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
              className="text-purple-600 underline hover:text-purple-800"
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
                  className="text-blue-600 underline hover:text-blue-800"
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
            <p className="text-gray-600 text-sm mb-2">
              No sold properties found in this area. Try clicking Refresh to fetch the latest data.
            </p>
            {info?.debug && (
              <details className="text-left mt-3 bg-white rounded-lg p-3 border border-purple-200">
                <summary className="cursor-pointer text-sm font-semibold text-purple-700">
                  Debug Info
                </summary>
                <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-all max-h-40 overflow-auto">
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
            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
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
                    ? 'bg-amber-50 border-amber-400 border-2'
                    : index === 0
                    ? 'bg-orange-50 border-orange-400 border-2'
                    : `bg-white border-purple-100 ${colors.itemHover}`
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
                      <span className="text-xs text-gray-500">{sale.similarity}% match</span>
                      {sale.distance != null && (
                        sale.homely_url ? (
                          <a
                            href={sale.homely_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                            title="View on Homely"
                          >
                            {formatDistance(sale.distance)} away
                            <MapPin size={10} />
                          </a>
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">
                            {formatDistance(sale.distance)} away
                          </span>
                        )
                      )}
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
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
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
                    <p className="font-bold text-emerald-600 text-lg">${sale.price?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{sale.sold_date}</p>
                    {sale.distance != null && (
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
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
