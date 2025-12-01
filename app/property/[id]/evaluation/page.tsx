'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateEvaluationPDF } from '@/utils/pdfGenerator';
import { API } from '@/lib/config';
import { usePageView } from '@/hooks/useAudit';

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

  // Marketing Strategy Modal state
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
  const [marketingStrategyText, setMarketingStrategyText] = useState('');

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const response = await fetch(`${API}/properties/${propertyId}`);
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

  const evaluateProperty = async () => {
    setEvaluating(true);
    setError(null);

    try {
      const response = await fetch(`${API}/properties/${propertyId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to evaluate property');
      }

      const data = await response.json();
      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_report: data.evaluation_report,
              improvements_detected: data.improvements_detected,
              evaluation_date: new Date().toISOString(),
            }
          : null
      );
    } catch (err: any) {
      console.error('Error evaluating property:', err);
      setError(err.message || 'Failed to evaluate property');
    } finally {
      setEvaluating(false);
    }
  };

  const handleExportPDF = () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    try {
      // Calculate price per sqm if we have both price and size
      const pricePerSqm = property.price && property.size
        ? Math.round(property.price / property.size)
        : undefined;

      // Generate and download the PDF
      const filename = generateEvaluationPDF(
        property,
        property.evaluation_report,
        undefined, // comparablesData - not available on this page
        pricePerSqm
      );

      // Show success message
      alert(`PDF exported successfully: ${filename}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
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
      const response = await fetch(`${API}/properties/${propertyId}/generate-evaluation-ad`, {
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

    const patterns = [
      /Market\s*Value[:\s-]+\$\s*([\d,]+)/i,
      /Market\s*value\s*estimate[:\s-]+\$\s*([\d,]+)/i,
      /Estimated\s*Value[:\s-]+\$\s*([\d,]+)/i,
      /Mid[:\s-]+\$\s*([\d,]+)/i,
    ];

    for (const pattern of patterns) {
      const match = reportText.match(pattern);
      if (match && match[1]) {
        const price = parseInt(match[1].replace(/,/g, ''));
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
      const response = await fetch(`${API}/properties/${propertyId}/apply-valuation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_value: marketValue }),
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

      const response = await fetch(`${API}/properties/${propertyId}/apply-marketing-strategy`, {
        method: 'POST',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Property not found</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
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
      <header style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 1rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🏠</span>
          <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0ea5e9', margin: 0 }}>PropertyPitch</h1>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
        {/* Back Button */}
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href={`/property/${propertyId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '1rem',
            }}
          >
            ← Back to Property
          </Link>
        </div>

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
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            borderRadius: '12px',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💰 Property Valuation
          </h1>
          <h2 style={{ fontSize: '1rem', color: '#1e40af', marginBottom: '0.75rem', wordBreak: 'break-word' }}>{property.location}</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#1e40af' }}>
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
              <div style={{ color: '#059669', fontWeight: '700' }}>Listed: ${property.price.toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* Evaluation Section */}
        {!property.evaluation_report ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem', color: '#0f172a' }}>
              Get Your AI Property Valuation
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
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
                <p style={{ color: '#075985', fontSize: '0.9rem', margin: 0 }}>Compares with Domain.com.au & Realestate.com.au</p>
              </div>

              <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '12px', border: '2px solid #fbbf24' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#78350f' }}>Value Adjustments</h4>
                <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>Calculates impact of detected improvements on value</p>
              </div>
            </div>

            <button
              onClick={evaluateProperty}
              disabled={evaluating}
              style={{
                background: evaluating ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '1.25rem 2.5rem',
                borderRadius: '12px',
                border: 'none',
                cursor: evaluating ? 'not-allowed' : 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              ✨ {evaluating ? 'Evaluating... Please wait up to 2 minutes' : 'Start Property Evaluation'}
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
                📥 Export as PDF
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
