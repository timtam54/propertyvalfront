'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePageView } from '@/hooks/useAudit';

interface TrendsData {
  suburb: string;
  property_type?: string;
  avg_annual_growth: number;
  data_points: number;
  years_covered: number[];
  yearly_medians: Record<number, number>;
  yoy_growth: Record<number, number>;
  list_vs_sold_analysis?: {
    overall_avg: number;
    samples: number;
  };
}

export default function GrowthTrendsPage() {
  // Track page view for audit
  usePageView('growth-trends');

  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('NSW');
  const [propertyType, setPropertyType] = useState('');
  const [fromYear, setFromYear] = useState(2008);
  const [loading, setLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!suburb.trim()) {
      setError('Please enter a suburb name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        suburb: suburb.trim(),
        state: state,
        from_year: fromYear.toString()
      });

      if (propertyType) {
        params.append('property_type', propertyType);
      }

      const response = await fetch(`/api/property-data/growth-trends?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTrendsData(data.trends);
      } else {
        setError(data.message || 'No data found');
        setTrendsData(null);
      }
    } catch (err) {
      console.error('Error analyzing trends:', err);
      setError('Failed to calculate trends');
      setTrendsData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/data-management"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'white',
              textDecoration: 'none'
            }}
          >
            <span style={{ fontSize: '24px' }}>←</span>
          </Link>
          <div>
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: 'white', fontSize: '24px' }}>📈</span>
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', margin: 0 }}>
              Growth Trends Analysis
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', margin: '0.5rem 0 0 0' }}>
              Analyze property price growth and market trends
            </p>
          </div>
        </div>

        {/* Input Form */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '24px' }}>📊</span>
            Select Location
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Suburb *</label>
              <input
                type="text"
                placeholder="e.g., Bondi"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>State *</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  background: 'white'
                }}
              >
                <option value="NSW">NSW</option>
                <option value="VIC">VIC</option>
                <option value="QLD">QLD</option>
                <option value="WA">WA</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="ACT">ACT</option>
                <option value="NT">NT</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Property Type (Optional)</label>
              <input
                type="text"
                placeholder="e.g., House, Unit"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>From Year</label>
              <input
                type="number"
                min="2008"
                max={new Date().getFullYear()}
                value={fromYear}
                onChange={(e) => setFromYear(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              padding: '1rem 2rem',
              background: loading ? '#d1d5db' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze Trends'}
          </button>
        </div>

        {/* Results */}
        {trendsData && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              Results for {trendsData.suburb}, {state}
              {trendsData.property_type && ` (${trendsData.property_type})`}
            </h2>

            {/* Summary Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                padding: '1.5rem',
                background: '#f0fdf4',
                borderRadius: '12px',
                border: '2px solid #86efac'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Average Annual Growth
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#166534' }}>
                  {trendsData.avg_annual_growth > 0 ? '+' : ''}{trendsData.avg_annual_growth}%
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: '#eff6ff',
                borderRadius: '12px',
                border: '2px solid #93c5fd'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Data Points
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1e40af' }}>
                  {trendsData.data_points}
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: '#fef3c7',
                borderRadius: '12px',
                border: '2px solid #fbbf24'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Years Covered
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#92400e' }}>
                  {trendsData.years_covered.length}
                </div>
              </div>
            </div>

            {/* Yearly Median Prices */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Median Prices by Year</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem', fontWeight: '600' }}>Year</th>
                      <th style={{ padding: '0.75rem', fontWeight: '600' }}>Median Price</th>
                      <th style={{ padding: '0.75rem', fontWeight: '600' }}>YoY Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendsData.years_covered.map((year) => {
                      const median = trendsData.yearly_medians[year];
                      const growth = trendsData.yoy_growth[year];
                      return (
                        <tr key={year} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{year}</td>
                          <td style={{ padding: '0.75rem' }}>${median ? median.toLocaleString() : 'N/A'}</td>
                          <td style={{
                            padding: '0.75rem',
                            fontWeight: '600',
                            color: growth > 0 ? '#059669' : growth < 0 ? '#dc2626' : '#6b7280'
                          }}>
                            {growth !== undefined ? `${growth > 0 ? '+' : ''}${growth}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Price Chart */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>Price Trend Visualization</h3>
              <div style={{
                position: 'relative',
                height: '300px',
                background: '#f9fafb',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                {trendsData.years_covered.map((year, index) => {
                  const median = trendsData.yearly_medians[year];
                  const maxPrice = Math.max(...Object.values(trendsData.yearly_medians));
                  const height = (median / maxPrice) * 250;
                  const left = (index / (trendsData.years_covered.length - 1 || 1)) * 90;

                  return (
                    <div
                      key={year}
                      style={{
                        position: 'absolute',
                        bottom: '40px',
                        left: `${left}%`,
                        width: '40px',
                        height: `${height}px`,
                        background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '4px 4px 0 0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        bottom: '-25px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        whiteSpace: 'nowrap'
                      }}>
                        {year}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List vs Sold Analysis */}
            {trendsData.list_vs_sold_analysis && trendsData.list_vs_sold_analysis.samples > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem' }}>List vs Sold Price Analysis</h3>
                <div style={{
                  padding: '1.5rem',
                  background: '#eff6ff',
                  borderRadius: '12px',
                  border: '2px solid #93c5fd'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Average Difference (List to Sold)
                    </div>
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: '800',
                      color: trendsData.list_vs_sold_analysis.overall_avg > 0 ? '#059669' : '#dc2626'
                    }}>
                      {trendsData.list_vs_sold_analysis.overall_avg > 0 ? '+' : ''}{trendsData.list_vs_sold_analysis.overall_avg}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1e40af', marginTop: '0.25rem' }}>
                      Based on {trendsData.list_vs_sold_analysis.samples} properties with both list and sold prices
                    </div>
                  </div>
                  <p style={{ color: '#1e40af', margin: 0, lineHeight: '1.6' }}>
                    {trendsData.list_vs_sold_analysis.overall_avg > 5 && "Properties are selling significantly ABOVE list price - strong seller's market with high demand."}
                    {trendsData.list_vs_sold_analysis.overall_avg >= 0 && trendsData.list_vs_sold_analysis.overall_avg <= 5 && "Properties are selling close to or slightly above list price - balanced market."}
                    {trendsData.list_vs_sold_analysis.overall_avg < 0 && trendsData.list_vs_sold_analysis.overall_avg >= -5 && "Properties are selling slightly below list price - some buyer negotiation power."}
                    {trendsData.list_vs_sold_analysis.overall_avg < -5 && "Properties are selling significantly BELOW list price - buyer's market with negotiation opportunities."}
                  </p>
                </div>
              </div>
            )}

            {/* Interpretation */}
            <div style={{
              padding: '1.5rem',
              background: '#f0fdf4',
              borderRadius: '12px',
              border: '2px solid #86efac'
            }}>
              <h4 style={{ marginTop: 0, color: '#166534', fontSize: '1.125rem', fontWeight: '700' }}>Interpretation</h4>
              <p style={{ color: '#166534', margin: 0, lineHeight: '1.6' }}>
                Based on {trendsData.data_points} property sales from {trendsData.years_covered[0]} to {trendsData.years_covered[trendsData.years_covered.length - 1]},
                this market has shown an average annual growth rate of <strong>{trendsData.avg_annual_growth}%</strong>.
                {trendsData.avg_annual_growth > 8 && " This indicates a strong growth market with excellent capital gains potential."}
                {trendsData.avg_annual_growth >= 5 && trendsData.avg_annual_growth <= 8 && " This represents steady, sustainable growth in line with national averages."}
                {trendsData.avg_annual_growth < 5 && " This suggests a slower growth market, potentially offering value opportunities."}
              </p>
            </div>
          </div>
        )}

        {!trendsData && !loading && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center',
            color: '#6b7280',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem', opacity: 0.5 }}>📈</div>
            <p style={{ fontSize: '1.125rem', margin: 0 }}>
              Enter a suburb above and click &quot;Analyze Trends&quot; to see growth data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
