'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePageView } from '@/hooks/useAudit';

interface SoldProperty {
  id: string;
  location: string;
  beds: number;
  baths: number;
  carpark: number;
  price: number;
  sold_price: number;
  sale_date: string;
  images: string[];
  property_type?: string;
}

interface Stats {
  totalSold: number;
  totalValue: number;
  avgVsList: number;
}

export default function SoldPropertiesPage() {
  const router = useRouter();

  // Track page view for audit
  usePageView('sold-properties');

  const [properties, setProperties] = useState<SoldProperty[]>([]);
  const [suburbs, setSuburbs] = useState<string[]>([]);
  const [selectedSuburb, setSelectedSuburb] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalSold: 0,
    totalValue: 0,
    avgVsList: 0
  });

  useEffect(() => {
    fetchSuburbs();
    fetchSoldProperties();
  }, []);

  useEffect(() => {
    fetchSoldProperties();
  }, [selectedSuburb]);

  const fetchSuburbs = async () => {
    try {
      const response = await fetch('/api/properties/sold/suburbs');
      if (response.ok) {
        const data = await response.json();
        setSuburbs(data.suburbs || []);
      }
    } catch (error) {
      console.error('Error fetching suburbs:', error);
    }
  };

  const fetchSoldProperties = async () => {
    setLoading(true);
    try {
      const url = selectedSuburb === 'all'
        ? '/api/properties/sold/list'
        : `/api/properties/sold/list?suburb=${encodeURIComponent(selectedSuburb)}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);

        // Calculate stats
        const props = data.properties || [];
        const totalSold = props.length;
        const totalValue = props.reduce((sum: number, p: SoldProperty) => sum + (p.sold_price || 0), 0);

        let avgDiff = 0;
        const propsWithBoth = props.filter((p: SoldProperty) => p.price && p.sold_price);
        if (propsWithBoth.length > 0) {
          const totalDiff = propsWithBoth.reduce((sum: number, p: SoldProperty) => {
            return sum + ((p.sold_price - p.price) / p.price) * 100;
          }, 0);
          avgDiff = totalDiff / propsWithBoth.length;
        }

        setStats({
          totalSold,
          totalValue,
          avgVsList: avgDiff
        });
      }
    } catch (error) {
      console.error('Error fetching sold properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResell = async (propertyId: string) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/resell`, {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh the list
        fetchSoldProperties();
        alert('Property marked for resale successfully!');
      } else {
        alert('Failed to mark property for resale');
      }
    } catch (error) {
      console.error('Error reselling property:', error);
      alert('Error marking property for resale');
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPriceDifference = (listPrice: number, soldPrice: number) => {
    const diff = ((soldPrice - listPrice) / listPrice) * 100;
    return diff;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '12px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <Link href="/" style={{
          color: 'white',
          textDecoration: 'none',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center'
        }}>
          ←
        </Link>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
        </div>
        <h1 style={{
          color: 'white',
          fontSize: '20px',
          fontWeight: 'bold',
          margin: 0
        }}>
          Sold Properties
        </h1>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', marginBottom: '3px' }}>
            Total Sold
          </div>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
            {stats.totalSold}
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', marginBottom: '3px' }}>
            Total Value
          </div>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
            {formatPrice(stats.totalValue)}
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', marginBottom: '3px' }}>
            Avg vs List
          </div>
          <div style={{
            color: stats.avgVsList >= 0 ? '#4ade80' : '#f87171',
            fontSize: '20px',
            fontWeight: 'bold'
          }}>
            {stats.avgVsList >= 0 ? '+' : ''}{stats.avgVsList.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Filter by Suburb */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{
          color: 'white',
          fontSize: '16px',
          marginBottom: '12px',
          fontWeight: '500'
        }}>
          Filter by Suburb
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <button
            onClick={() => setSelectedSuburb('all')}
            style={{
              padding: '10px 20px',
              borderRadius: '25px',
              border: 'none',
              background: selectedSuburb === 'all' ? 'white' : 'rgba(255,255,255,0.2)',
              color: selectedSuburb === 'all' ? '#764ba2' : 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            All Suburbs
          </button>
          {suburbs.map((suburb) => (
            <button
              key={suburb}
              onClick={() => setSelectedSuburb(suburb)}
              style={{
                padding: '10px 20px',
                borderRadius: '25px',
                border: 'none',
                background: selectedSuburb === suburb ? 'white' : 'rgba(255,255,255,0.2)',
                color: selectedSuburb === suburb ? '#764ba2' : 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {suburb}
            </button>
          ))}
        </div>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          color: 'white',
          padding: '50px'
        }}>
          Loading sold properties...
        </div>
      ) : properties.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: 'white',
          padding: '50px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '15px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏠</div>
          <div style={{ fontSize: '18px' }}>No sold properties found</div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '5px' }}>
            Properties marked as sold will appear here
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          {properties.map((property) => {
            const priceDiff = property.price && property.sold_price
              ? getPriceDifference(property.price, property.sold_price)
              : null;

            return (
              <div key={property.id} style={{
                background: 'white',
                borderRadius: '15px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}>
                {/* Property Image */}
                <div style={{
                  height: '180px',
                  background: property.images?.[0]
                    ? `url(${property.images[0]}) center/cover`
                    : 'linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%)',
                  position: 'relative'
                }}>
                  {/* SOLD Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: '#22c55e',
                    color: 'white',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '1px'
                  }}>
                    SOLD
                  </div>

                  {/* Sale Date */}
                  {property.sale_date && (
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px'
                    }}>
                      {formatDate(property.sale_date)}
                    </div>
                  )}
                </div>

                {/* Property Details */}
                <div style={{ padding: '18px' }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '10px',
                    lineHeight: '1.4'
                  }}>
                    {property.location}
                  </div>

                  {/* Beds, Baths, Cars */}
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    marginBottom: '15px',
                    color: '#666',
                    fontSize: '13px'
                  }}>
                    <span>🛏 {property.beds}</span>
                    <span>🛁 {property.baths}</span>
                    <span>🚗 {property.carpark}</span>
                  </div>

                  {/* Prices */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>
                        Listed
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#666' }}>
                        {property.price ? formatPrice(property.price) : 'N/A'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>
                        Sold
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e' }}>
                        {formatPrice(property.sold_price)}
                      </div>
                    </div>
                  </div>

                  {/* Price Difference */}
                  {priceDiff !== null && (
                    <div style={{
                      background: priceDiff >= 0 ? '#dcfce7' : '#fee2e2',
                      color: priceDiff >= 0 ? '#166534' : '#991b1b',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      textAlign: 'center',
                      marginBottom: '12px'
                    }}>
                      {priceDiff >= 0 ? '↑' : '↓'} {Math.abs(priceDiff).toFixed(1)}% {priceDiff >= 0 ? 'above' : 'below'} list price
                    </div>
                  )}

                  {/* Resell Button */}
                  <button
                    onClick={() => handleResell(property.id)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 5px 20px rgba(102, 126, 234, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Resell Property
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
