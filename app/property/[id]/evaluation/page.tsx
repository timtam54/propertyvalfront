'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateEvaluationPDF } from '@/utils/pdfGenerator';
import { API } from '@/lib/config';
import { usePageView } from '@/hooks/useAudit';
import ValuationQuality from '@/components/ValuationQuality';
import HistoricSalesCard from '@/components/HistoricSalesCard';
import DarkModeToggle from '@/components/DarkModeToggle';
import type {
  ValuationHistoryEntry,
  ConfidenceScoring,
  SuburbMarketTrends,
  ComparableProperty
} from '@/lib/types';

interface Property {
  id: string;
  location: string;
  beds: number;
  baths: number;
  carpark: number;
  size?: number | null;
  price?: number | null;
  images: string[];
  evaluation_report?: string | null;
  evaluation_date?: string | null;
  improvements_detected?: string | null;
  evaluation_ad?: string | null;
  pricing_type?: string | null;
  price_upper?: number | null;
  marketing_strategy?: string | null;
  property_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // New valuation quality fields
  valuation_history?: ValuationHistoryEntry[];
  confidence_scoring?: ConfidenceScoring | null;
  suburb_trends?: SuburbMarketTrends | null;
  comparables_data?: {
    comparable_sold: ComparableProperty[];
    best_match?: {
      id: string;
      address: string;
      price: number;
      beds: number | null;
      baths: number | null;
      carpark: number | null;
      land_area: number | null;
      property_type: string;
      sold_date: string;
      similarity_score: number;
      is_exact_match: boolean;
    } | null;
    exact_matches_count?: number;
    valuation_basis?: string;
    statistics: {
      total_found: number;
      sold_count: number;
      price_range: {
        min: number | null;
        max: number | null;
        avg: number | null;
        median: number | null;
      };
      exact_match_avg?: number | null;
    };
    data_source?: string;
    domain_api_error?: string | null;
    domain_api_key_used?: string | null;
  } | null;
  selected_comparables?: string[];
}

interface PricingOption {
  type: string;
  label: string;
  displayPrice: string;
  price: number | null;
  priceUpper?: number | null;
  description: string;
}

export default function PropertyEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  // Track page view for audit with property ID
  usePageView('property-evaluation', propertyId ? parseInt(propertyId, 10) || 0 : 0);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [generatingAd, setGeneratingAd] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReport, setEditedReport] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Marketing Strategy Modal state
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
  const [marketingStrategyText, setMarketingStrategyText] = useState('');

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      // Add cache-busting timestamp to ensure fresh data
      const response = await fetch(`${API}/properties/${propertyId}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch property');
      const data = await response.json();
      setProperty(data);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  // State for recalculating
  const [recalculating, setRecalculating] = useState(false);
  const [selectedComparableIds, setSelectedComparableIds] = useState<string[]>([]);

  // State for historic sales data from HistoricSalesCard
  // This is the SINGLE SOURCE OF TRUTH for comparable sales - no duplicate logic!
  const [historicSalesData, setHistoricSalesData] = useState<any[]>([]);

  // Initialize selected comparables when property loads
  useEffect(() => {
    if (property?.selected_comparables) {
      setSelectedComparableIds(property.selected_comparables);
    } else if (property?.comparables_data?.comparable_sold) {
      setSelectedComparableIds(property.comparables_data.comparable_sold.map((c: any) => c.id));
    }
  }, [property?.selected_comparables, property?.comparables_data]);

  const handleComparableToggle = (id: string) => {
    setSelectedComparableIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRecalculate = async (selectedIds: string[]) => {
    setRecalculating(true);
    setError(null);

    try {
      const response = await fetch(`${API}/properties/${propertyId}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_comparable_ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to recalculate');
      }

      const data = await response.json();
      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_report: data.evaluation_report,
              comparables_data: data.comparables_data,
              confidence_scoring: data.confidence_scoring,
              valuation_history: data.valuation_history,
              selected_comparables: selectedIds,
              evaluation_date: new Date().toISOString(),
            }
          : null
      );
    } catch (err: any) {
      console.error('Error recalculating:', err);
      setError(err.message || 'Failed to recalculate');
    } finally {
      setRecalculating(false);
    }
  };

  const evaluateProperty = async () => {
    setEvaluating(true);
    setError(null);
    setWarning(null);

    // CRITICAL: Check that historic sales data is available
    // The evaluation MUST use the same data shown in HistoricSalesCard
    console.log(`[EvaluatePage] Sending ${historicSalesData.length} historic sales to API`);
    if (historicSalesData.length > 0) {
      console.log(`[EvaluatePage] Top 3 sales being sent:`);
      historicSalesData.slice(0, 3).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.address} - $${s.price} - ${s.similarity}% match - ${s.distance}km`);
      });
    } else {
      console.warn(`[EvaluatePage] WARNING: historicSalesData is EMPTY!`);
      setError('Please wait for the Historic Property Sales section to load before evaluating.');
      setEvaluating(false);
      return;
    }

    try {
      // Use local API route for web scraping evaluation
      // PASS THE HISTORIC SALES DATA from HistoricSalesCard to ensure consistency
      const response = await fetch(`/api/properties/${propertyId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicSales: historicSalesData, // Pass the pre-calculated data from HistoricSalesCard
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to evaluate property');
      }

      const data = await response.json();

      // Check for data source warning
      if (data.domain_api_error) {
        setWarning(data.domain_api_error);
      }

      // Update local state immediately with evaluation results
      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_report: data.evaluation_report,
              improvements_detected: data.improvements_detected,
              comparables_data: data.comparables_data,
              confidence_scoring: data.confidence_scoring,
              valuation_history: data.valuation_history,
              suburb_trends: data.suburb_trends,
              selected_comparables: data.comparables_data?.comparable_sold?.map((c: any) => c.id) || [],
              evaluation_date: new Date().toISOString(),
            }
          : null
      );

      // Re-fetch from database to confirm save was successful
      // Small delay to ensure backend has processed the save
      setTimeout(async () => {
        try {
          const freshResponse = await fetch(`${API}/properties/${propertyId}?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          });
          if (freshResponse.ok) {
            const freshData = await freshResponse.json();
            setProperty(freshData);
            console.log('Re-fetched property after evaluation, evaluation_date:', freshData.evaluation_date);
          }
        } catch (e) {
          console.error('Failed to re-fetch after evaluation:', e);
        }
      }, 1000);

    } catch (err: any) {
      console.error('Error evaluating property:', err);
      setError(err.message || 'Failed to evaluate property');
    } finally {
      setEvaluating(false);
    }
  };

  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleExportPDF = async () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    setGeneratingPDF(true);
    setError(null);

    try {
      // Calculate price per sqm if we have both price and size
      const pricePerSqm = property.price && property.size
        ? Math.round(property.price / property.size)
        : undefined;

      // Generate and download the PDF (async to fetch images from server)
      const filename = await generateEvaluationPDF(
        property,
        property.evaluation_report,
        property.comparables_data || undefined,
        pricePerSqm
      );

      // Show success message (filename is returned)
      console.log('PDF exported:', filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generateAdFromEvaluation = async () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    setGeneratingAd(true);
    setError(null);

    try {
      // Use local API route for ad generation (uses OpenAI)
      const response = await fetch(`/api/properties/${propertyId}/generate-evaluation-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate ad');
      }

      const data = await response.json();
      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_ad: data.ad_content,
            }
          : null
      );
    } catch (err: any) {
      console.error('Error generating ad:', err);
      setError(err.message || 'Failed to generate ad');
    } finally {
      setGeneratingAd(false);
    }
  };

  const startEditingReport = () => {
    setEditedReport(property?.evaluation_report || '');
    setIsEditingReport(true);
  };

  const cancelEditingReport = () => {
    setIsEditingReport(false);
    setEditedReport('');
  };

  const saveEditedReport = async () => {
    if (!editedReport.trim()) {
      setError('Report cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API}/properties/${propertyId}/update-evaluation-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluation_report: editedReport }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save report');
      }

      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_report: editedReport,
            }
          : null
      );
      setIsEditingReport(false);
    } catch (err: any) {
      console.error('Error saving report:', err);
      setError(err.message || 'Failed to save report');
    }
  };

  const applyValuationToListing = async () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    // Extract market value from evaluation report
    const reportText = property.evaluation_report;
    let marketValue: number | null = null;

    // Try multiple patterns to find the valuation price
    const patterns = [
      // Range patterns - extract the middle or upper value
      /\$\s*([\d,]+)\s*(?:to|-)\s*\$\s*([\d,]+)/i, // $X to $Y or $X - $Y (captures both)
      // Specific value patterns
      /Market\s*Value[:\s-]+\$\s*([\d,]+)/i,
      /Market\s*value\s*estimate[:\s-]+\$\s*([\d,]+)/i,
      /Estimated\s*(?:Market\s*)?Value[:\s-]+\$\s*([\d,]+)/i,
      /Estimated\s*Value\s*Range[:\s\S]*?\$\s*([\d,]+)/i,
      /valuation[:\s]+\$\s*([\d,]+)/i,
      /valued?\s*at[:\s]+\$\s*([\d,]+)/i,
      /Mid[:\s-]+\$\s*([\d,]+)/i,
      /estimate[:\s]+\$\s*([\d,]+)/i,
      // Million patterns
      /\$\s*([\d.]+)\s*million/i,
      /\$\s*([\d.]+)\s*m\b/i,
    ];

    for (const pattern of patterns) {
      const match = reportText.match(pattern);
      if (match) {
        let price: number;

        // Check if it's a range pattern (has two capture groups with values)
        if (match[2] && parseInt(match[2].replace(/,/g, '')) > 0) {
          // It's a range - use the average of low and high
          const low = parseInt(match[1].replace(/,/g, ''));
          const high = parseInt(match[2].replace(/,/g, ''));
          price = Math.round((low + high) / 2);
        } else if (match[1]) {
          // Check for million notation
          if (pattern.toString().includes('million') || pattern.toString().includes('m\\b')) {
            price = Math.round(parseFloat(match[1]) * 1000000);
          } else {
            price = parseInt(match[1].replace(/,/g, ''));
          }
        } else {
          continue;
        }

        if (price >= 100000 && price <= 50000000) {
          marketValue = price;
          break;
        }
      }
    }

    if (!marketValue) {
      setError('Could not extract valuation price from report');
      return;
    }

    try {
      // Use standard property update endpoint
      const response = await fetch(`${API}/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: marketValue }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to apply valuation');
      }

      setProperty((prev) =>
        prev
          ? {
              ...prev,
              price: marketValue,
            }
          : null
      );
      alert(`Listing price updated to $${marketValue.toLocaleString()}`);
    } catch (err: any) {
      console.error('Error applying valuation:', err);
      setError(err.message || 'Failed to apply valuation');
    }
  };

  const openMarketingStrategyModal = () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    const reportText = property.evaluation_report;

    // Extract marketing strategy text
    let marketingStrategy: string | null = null;
    const strategyPatterns = [
      /Positioning\s*advice[:\s-]+([\s\S]*?)(?=\n\n|\n\d+\.|\n-|$)/i,
      /Marketing\s*strategy[:\s-]+([\s\S]*?)(?=\n\n|\n\d+\.|\n-|$)/i,
      /Recommended\s*approach[:\s-]+([\s\S]*?)(?=\n\n|\n\d+\.|\n-|$)/i,
      /5\.\s*POSITIONING\s*ADVICE[\s\S]*?[-•]([\s\S]*?)(?=\n\n|$)/i,
    ];

    for (const pattern of strategyPatterns) {
      const match = reportText.match(pattern);
      if (match && match[1]) {
        let extracted = match[1]
          .trim()
          .replace(/^[-•*]\s*/gm, '')
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (extracted.length > 50 && extracted.length < 2000) {
          marketingStrategy = extracted;
          break;
        }
      }
    }

    if (!marketingStrategy) {
      // Fallback: use a portion of the evaluation report
      marketingStrategy = reportText.substring(0, 300) + '...';
    }

    // Truncate if too long
    if (marketingStrategy.length > 1000) {
      marketingStrategy = marketingStrategy.substring(0, 997) + '...';
    }

    setMarketingStrategyText(marketingStrategy);

    // Extract pricing options from report
    const options: PricingOption[] = [];

    // Look for "Offers Over" recommendations
    const offersOverMatch = reportText.match(/(?:recommend|suggest|use)[\s\S]*?["']?Offers\s*Over\s*\$?\s*([\d,]+)/i);
    if (offersOverMatch) {
      const price = parseInt(offersOverMatch[1].replace(/,/g, ''));
      if (price >= 100000 && price <= 50000000) {
        options.push({
          type: 'offers_over',
          label: 'Offers Over',
          displayPrice: `Offers Over $${price.toLocaleString()}`,
          price: price,
          description: 'Creates urgency and competitive bidding'
        });
      }
    }

    // Look for "Fixed Price" recommendations
    const fixedPriceMatch = reportText.match(/(?:fixed\s*price|list\s*at|asking\s*price)[\s\S]*?\$?\s*([\d,]+)/i);
    if (fixedPriceMatch) {
      const price = parseInt(fixedPriceMatch[1].replace(/,/g, ''));
      if (price >= 100000 && price <= 50000000) {
        options.push({
          type: 'fixed',
          label: 'Fixed Price',
          displayPrice: `$${price.toLocaleString()}`,
          price: price,
          description: 'Clear, transparent pricing'
        });
      }
    }

    // Look for "Price Guide" or range
    const priceGuideMatch = reportText.match(/(?:price\s*guide|range)[\s\S]*?\$?\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/i);
    if (priceGuideMatch) {
      const lower = parseInt(priceGuideMatch[1].replace(/,/g, ''));
      const upper = parseInt(priceGuideMatch[2].replace(/,/g, ''));
      if (lower >= 100000 && upper <= 50000000) {
        options.push({
          type: 'price_guide',
          label: 'Price Guide',
          displayPrice: `$${lower.toLocaleString()} - $${upper.toLocaleString()}`,
          price: lower,
          priceUpper: upper,
          description: 'Flexible range for negotiations'
        });
      }
    }

    // Add fallback options if no specific recommendations found
    if (options.length === 0 && property.price) {
      options.push(
        {
          type: 'offers_over',
          label: 'Offers Over',
          displayPrice: `Offers Over $${property.price.toLocaleString()}`,
          price: property.price,
          description: 'Recommended for premium positioning'
        },
        {
          type: 'fixed',
          label: 'Fixed Price',
          displayPrice: `$${property.price.toLocaleString()}`,
          price: property.price,
          description: 'Standard pricing approach'
        }
      );
    }

    // Always add Contact Agent and Auction options
    options.push(
      {
        type: 'contact_agent',
        label: 'Contact Agent',
        displayPrice: 'Contact Agent',
        price: null,
        description: 'For exclusive/high-end properties'
      },
      {
        type: 'auction',
        label: 'Auction',
        displayPrice: 'Auction',
        price: null,
        description: 'Competitive bidding environment'
      }
    );

    setPricingOptions(options);
    setShowMarketingModal(true);
  };

  const selectPricingOption = async (option: PricingOption) => {
    setShowMarketingModal(false);

    try {
      const updateData: any = {
        marketing_strategy: marketingStrategyText,
        pricing_type: option.type,
      };

      if (option.price) {
        updateData.price = option.price;
      }
      if (option.priceUpper) {
        updateData.price_upper = option.priceUpper;
      }

      // Use standard property update endpoint
      const response = await fetch(`${API}/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to apply marketing strategy');
      }

      setProperty((prev) =>
        prev
          ? {
              ...prev,
              marketing_strategy: marketingStrategyText,
              pricing_type: option.type,
              price: option.price || prev.price,
              price_upper: option.priceUpper || prev.price_upper,
            }
          : null
      );
      alert(`Marketing strategy applied with ${option.label} pricing!`);
    } catch (err: any) {
      console.error('Error applying marketing strategy:', err);
      setError(err.message || 'Failed to apply marketing strategy');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-500 dark:text-gray-400">Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-500 dark:text-gray-400">Property not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Marketing Strategy Modal */}
      {showMarketingModal && (
        <>
          <div
            onClick={() => setShowMarketingModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              zIndex: 10000,
              maxWidth: '550px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1f2937', fontWeight: '700' }}>
                Apply Marketing Strategy
              </h3>
              <p style={{ color: '#6b7280', margin: '0 0 20px 0', fontSize: '14px' }}>
                Select pricing strategy from recommendations:
              </p>

              {pricingOptions.map((option, idx) => (
                <div
                  key={option.type}
                  onClick={() => selectPricingOption(option)}
                  style={{
                    border: `2px solid ${idx === 0 ? '#059669' : '#e5e7eb'}`,
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    background: idx === 0 ? '#ecfdf5' : 'white',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#059669';
                    e.currentTarget.style.background = '#ecfdf5';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = idx === 0 ? '#059669' : '#e5e7eb';
                    e.currentTarget.style.background = idx === 0 ? '#ecfdf5' : 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#059669', marginBottom: '6px' }}>
                        {option.displayPrice}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {option.description}
                      </div>
                    </div>
                    {idx === 0 && (
                      <div
                        style={{
                          background: '#059669',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        RECOMMENDED
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginTop: '20px',
                  padding: '14px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  borderLeft: '4px solid #059669',
                }}
              >
                <div style={{ fontSize: '13px', color: '#374151', fontWeight: '500', marginBottom: '6px' }}>
                  Marketing Strategy Preview:
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
                  {marketingStrategyText.substring(0, 150)}...
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <h1 className="text-lg font-bold text-cyan-500">PropertyPitch</h1>
          </div>
          <DarkModeToggle />
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto p-4">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href={`/property/${propertyId}`}
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
          >
            ← Back to Property
          </Link>
        </div>

        {/* Warning Message */}
        {warning && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              color: '#b45309',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span>{warning}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Property Summary Header */}
        <div className="mb-4 p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl">
          <h1 className="text-xl font-bold mb-1 text-blue-900 dark:text-blue-200 flex items-center gap-2">
            💰 Property Valuation
          </h1>
          <h2 className="text-base text-blue-800 dark:text-blue-300 mb-3 break-words">{property.location}</h2>
          <div className="flex gap-4 flex-wrap text-sm text-blue-800 dark:text-blue-300">
            <div>
              <strong>{property.beds}</strong> Bedrooms
            </div>
            <div>
              <strong>{property.baths}</strong> Bathrooms
            </div>
            <div>
              <strong>{property.carpark}</strong> Car Parks
            </div>
            {property.size && (
              <div>
                <strong>{property.size}</strong> sqm
              </div>
            )}
            {property.price && (
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">Listed: ${property.price.toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* Historic Sales Card - ALWAYS render to populate data before evaluation */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
          <HistoricSalesCard
            propertyId={propertyId}
            propertyLocation={property.location}
            propertyType={property.property_type}
            propertyBeds={property.beds}
            propertyBaths={property.baths}
            propertyLandArea={property.size}
            propertyLatitude={property.latitude}
            propertyLongitude={property.longitude}
            variant="purple"
            maxItems={15}
            showSourceLink={true}
            onSalesProcessed={setHistoricSalesData}
          />
        </div>

        {/* Evaluation Section */}
        {!property.evaluation_report ? (
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              Get Your AI Property Valuation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-[600px] mx-auto">
              Our AI analyzes your property photos to detect improvements, then compares with market data.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem', maxWidth: '900px', margin: '0 auto 2rem' }}>
              <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '12px', border: '2px solid #bbf7d0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#14532d' }}>Photo Analysis</h4>
                <p style={{ color: '#166534', fontSize: '0.9rem', margin: 0 }}>AI detects renovations, extra rooms, and quality improvements</p>
              </div>

              <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '2px solid #bae6fd' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📈</div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#0c4a6e' }}>Market Data</h4>
                <p style={{ color: '#075985', fontSize: '0.9rem', margin: 0 }}>Compares with Homely.com.au and any property report data pasted in</p>
              </div>

              <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '12px', border: '2px solid #fbbf24' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#78350f' }}>Value Adjustments</h4>
                <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>Calculates impact of detected improvements on value</p>
              </div>
            </div>

            <button
              onClick={evaluateProperty}
              disabled={evaluating || historicSalesData.length === 0}
              style={{
                background: (evaluating || historicSalesData.length === 0) ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '1.25rem 2.5rem',
                borderRadius: '12px',
                border: 'none',
                cursor: (evaluating || historicSalesData.length === 0) ? 'not-allowed' : 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              ✨ {evaluating ? 'Evaluating... Please wait up to 2 minutes' : historicSalesData.length === 0 ? 'Loading comparable sales...' : 'Start Property Evaluation'}
            </button>

            {(!property.images || property.images.length === 0) && (
              <div
                style={{
                  background: '#fef3c7',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  border: '2px solid #fbbf24',
                  maxWidth: '600px',
                  margin: '2rem auto 0',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#92400e', fontSize: '0.95rem', margin: 0 }}>
                  ⚠️ <strong>No photos uploaded.</strong> Evaluation will be based on property specifications, comparable sales, and current market data. For more accurate valuation including condition assessment, add photos to the property listing.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Photo Gallery */}
            {property.images && property.images.length > 0 && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '2px solid #cbd5e1',
                  marginBottom: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📸 Property Photos ({property.images.length})
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {property.images.map((img, idx) => (
                    <div
                      key={idx}
                      style={{
                        aspectRatio: '4/3',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <img
                        src={img}
                        alt={`Property photo ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements Detected */}
            {property.improvements_detected && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '2px solid #fbbf24',
                  marginBottom: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📈 Improvements Detected from Photos
                </h3>
                <div style={{ color: '#78350f', fontSize: '1rem', whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                  {property.improvements_detected}
                </div>
              </div>
            )}

            {/* Evaluation Report */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                padding: '2.5rem',
                borderRadius: '16px',
                border: '2px solid #bbf7d0',
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💰 Comprehensive Valuation Report
                </h3>
                {!isEditingReport && (
                  <button
                    onClick={startEditingReport}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    ✏️ Edit Report
                  </button>
                )}
              </div>

              {isEditingReport ? (
                <div>
                  <textarea
                    value={editedReport}
                    onChange={(e) => setEditedReport(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '400px',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '2px solid #10b981',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      lineHeight: '1.9',
                      color: '#14532d',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEditingReport}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                      }}
                    >
                      ✕ Cancel
                    </button>
                    <button
                      onClick={saveEditedReport}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      💾 Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#14532d', fontSize: '1rem', whiteSpace: 'pre-wrap', lineHeight: '1.9' }}>
                  {property.evaluation_report}
                </div>
              )}
            </div>

            {/* Data Source Status - BIG CLEAR INDICATOR */}
            {property.comparables_data && (property.comparables_data.data_source?.includes('Realestate') || property.comparables_data.data_source?.includes('Domain') || property.comparables_data.data_source?.includes('Homely')) && property.comparables_data.statistics?.total_found > 0 ? (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                border: '3px solid #22c55e',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#15803d', marginBottom: '0.25rem' }}>
                  {property.comparables_data.data_source}
                </div>
                <div style={{ fontSize: '1rem', color: '#166534' }}>
                  {property.comparables_data.statistics?.total_found || 0} comparable sold properties found
                </div>
              </div>
            ) : null}

            {/* Valuation Quality Section */}
            <div style={{ marginBottom: '2rem' }}>
              <ValuationQuality
                valuationHistory={property.valuation_history}
                confidenceScoring={property.confidence_scoring}
                suburbTrends={property.suburb_trends}
                comparables={property.comparables_data?.comparable_sold}
                selectedComparables={selectedComparableIds}
                onComparableToggle={handleComparableToggle}
                onRecalculate={handleRecalculate}
                currentValue={property.comparables_data?.statistics?.price_range?.median || undefined}
              />
              {recalculating && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#dbeafe',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#1e40af'
                }}>
                  Recalculating valuation with selected comparables...
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', padding: '1rem 0' }}>
              <button
                onClick={evaluateProperty}
                disabled={evaluating}
                style={{
                  background: evaluating ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: evaluating ? 'not-allowed' : 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                ✨ {evaluating ? 'Re-evaluating...' : 'Re-evaluate Property'}
              </button>

              <button
                onClick={handleExportPDF}
                disabled={generatingPDF}
                style={{
                  background: generatingPDF ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: generatingPDF ? 'not-allowed' : 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                📥 {generatingPDF ? 'Generating PDF...' : 'Export as PDF'}
              </button>

              <button
                onClick={generateAdFromEvaluation}
                disabled={generatingAd}
                style={{
                  background: generatingAd ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: generatingAd ? 'not-allowed' : 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                📘 {generatingAd ? 'Generating Ad...' : 'Create Marketing Ad'}
              </button>

              <button
                onClick={applyValuationToListing}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                💲 Apply to Listing Price
              </button>

              <button
                onClick={openMarketingStrategyModal}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                📈 Apply Marketing Strategy
              </button>
            </div>

            {/* Generated Ad */}
            {property.evaluation_ad && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                  padding: '2.5rem',
                  borderRadius: '16px',
                  border: '2px solid #c4b5fd',
                  marginTop: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📘 Marketing Ad (Based on Evaluation)
                </h3>
                <div
                  style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontSize: '1rem',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap',
                    marginBottom: '1.5rem',
                  }}
                >
                  {property.evaluation_ad}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(property.evaluation_ad || '');
                    alert('Ad copied to clipboard!');
                  }}
                  style={{
                    background: '#7c3aed',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                >
                  📋 Copy Ad to Clipboard
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
