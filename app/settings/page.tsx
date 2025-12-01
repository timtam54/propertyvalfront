"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { API } from "@/lib/config";
import { usePageView } from "@/hooks/useAudit";

interface ApiKeys {
  domain_api_key: string | null;
  corelogic_client_key: string | null;
  corelogic_secret_key: string | null;
  realestate_api_key: string | null;
  pricefinder_api_key: string | null;
  google_places_api_key: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track page view for audit
  usePageView('settings');

  const [apiSettings, setApiSettings] = useState<ApiKeys>({
    domain_api_key: '',
    corelogic_client_key: '',
    corelogic_secret_key: '',
    realestate_api_key: '',
    pricefinder_api_key: '',
    google_places_api_key: ''
  });

  useEffect(() => {
    loadApiSettings();
  }, []);

  const loadApiSettings = async () => {
    try {
      const response = await fetch(`${API}/api-settings`);
      const data = await response.json();

      if (data.success && data.settings) {
        setApiSettings({
          domain_api_key: data.settings.domain_api_key || '',
          corelogic_client_key: data.settings.corelogic_client_key || '',
          corelogic_secret_key: data.settings.corelogic_secret_key || '',
          realestate_api_key: data.settings.realestate_api_key || '',
          pricefinder_api_key: data.settings.pricefinder_api_key || '',
          google_places_api_key: data.settings.google_places_api_key || ''
        });
      }
    } catch (err) {
      console.error('Failed to load API settings:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setApiSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveApiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`${API}/api-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiSettings)
      });

      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        toast.success("API settings saved successfully!");
        await loadApiSettings();
      } else {
        setError('Failed to save API settings');
        toast.error('Failed to save API settings');
      }
    } catch (err: any) {
      setError('Error saving API settings: ' + err.message);
      toast.error('Error saving API settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Simple Header with Back Link */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 1rem'
      }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.85rem',
            padding: '0.4rem 0.75rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: 'white',
            transition: 'all 0.2s'
          }}
        >
          ← Back
        </Link>
      </div>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        {/* Page Title */}
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#0ea5e9',
          marginBottom: '1rem'
        }}>
          Settings
        </h1>

        {/* Marketing Packages Section */}
        <section style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#1e40af',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>💰</span> Marketing Packages
          </h2>
          <p style={{
            color: '#1e3a8a',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            marginBottom: '1rem'
          }}>
            Configure marketing packages with different pricing tiers.
          </p>
          <button
            onClick={() => router.push('/settings/marketing')}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            Manage Packages →
          </button>
        </section>

        {/* Market Context Settings Section */}
        <section style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#78350f',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>🔄</span> Market Context
          </h2>
          <p style={{
            color: '#78350f',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            marginBottom: '1rem'
          }}>
            Update interest rates and market statistics.
          </p>
          <button
            onClick={() => router.push('/settings/market')}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
              color: 'white',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            Configure Market Data →
          </button>
        </section>

        {/* Property Data API Keys Section */}
        <section style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '0.5rem'
          }}>
            Property Data API Keys
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            marginBottom: '1rem'
          }}>
            Add API keys for property data services to get more accurate valuations.
          </p>

          {/* Benefits List with Checkmarks */}
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 2rem 0'
          }}>
            {[
              'More accurate and detailed property data',
              'Faster evaluation times',
              'Access to historical sold prices',
              'Detailed suburb analytics',
              'More reliable data availability'
            ].map((benefit, idx) => (
              <li key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem',
                color: '#374151',
                fontSize: '0.95rem'
              }}>
                <span style={{ color: '#10b981', fontSize: '1.1rem' }}>✓</span>
                {benefit}
              </li>
            ))}
          </ul>

          {/* Success Message */}
          {saveSuccess && (
            <div style={{
              background: '#d1fae5',
              border: '1px solid #34d399',
              color: '#065f46',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              ✓ API settings saved successfully!
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {/* API Keys Form */}
          <form onSubmit={handleSaveApiSettings}>
            {/* Domain API Key */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '0.25rem'
              }}>
                Domain.com.au API Key
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Get your API key from{' '}
                <a
                  href="https://developer.domain.com.au/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0ea5e9' }}
                >
                  developer.domain.com.au
                </a>
              </p>
              <input
                type="text"
                name="domain_api_key"
                value={apiSettings.domain_api_key || ''}
                onChange={handleInputChange}
                placeholder="Enter Domain API key (optional)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: '#f8fafc'
                }}
              />
            </div>

            {/* CoreLogic Client Key */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '0.25rem'
              }}>
                CoreLogic Client Key (Optional - Premium Data)
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Optional premium data provider. App works fully without this using free Domain/ABS/RBA APIs. Contact{' '}
                <a
                  href="https://www.corelogic.com.au/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0ea5e9' }}
                >
                  CoreLogic
                </a>
                {' '}for partnership after gaining traction.
              </p>
              <input
                type="text"
                name="corelogic_client_key"
                value={apiSettings.corelogic_client_key || ''}
                onChange={handleInputChange}
                placeholder="Not required - Domain API is primary source"
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: '#f1f5f9',
                  cursor: 'not-allowed',
                  color: '#94a3b8'
                }}
              />
            </div>

            {/* CoreLogic Secret Key */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '0.25rem'
              }}>
                CoreLogic Secret Key (Optional - Premium Data)
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Optional premium feature. System uses free public APIs (Domain, RBA, ABS) by default.
              </p>
              <input
                type="password"
                name="corelogic_secret_key"
                value={apiSettings.corelogic_secret_key || ''}
                onChange={handleInputChange}
                placeholder="Not required - Add after gaining user base"
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: '#f1f5f9',
                  cursor: 'not-allowed',
                  color: '#94a3b8'
                }}
              />
            </div>

            {/* Realestate.com.au API Key */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '0.25rem'
              }}>
                Realestate.com.au API Key
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Get API access from{' '}
                <a
                  href="https://developer.realestate.com.au/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0ea5e9' }}
                >
                  developer.realestate.com.au
                </a>
              </p>
              <input
                type="text"
                name="realestate_api_key"
                value={apiSettings.realestate_api_key || ''}
                onChange={handleInputChange}
                placeholder="Enter Realestate.com.au API key (optional)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: '#f8fafc'
                }}
              />
            </div>

            {/* PriceFinder API Key */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '0.25rem'
              }}>
                PriceFinder API Key
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Property valuation data from{' '}
                <a
                  href="https://www.pricefinder.com.au/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0ea5e9' }}
                >
                  PriceFinder
                </a>
              </p>
              <input
                type="text"
                name="pricefinder_api_key"
                value={apiSettings.pricefinder_api_key || ''}
                onChange={handleInputChange}
                placeholder="Enter PriceFinder API key (optional)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: '#f8fafc'
                }}
              />
            </div>

            {/* Google Places API Key */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '0.25rem'
              }}>
                Google Places API Key
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                For address validation and location data from{' '}
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0ea5e9' }}
                >
                  Google Places API
                </a>
              </p>
              <input
                type="text"
                name="google_places_api_key"
                value={apiSettings.google_places_api_key || ''}
                onChange={handleInputChange}
                placeholder="Enter Google Places API key (optional)"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: '#f8fafc'
                }}
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                padding: '0.875rem 2rem',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              {loading ? 'Saving...' : 'Save API Settings'}
            </button>
          </form>

          {/* Note about Free Web Scraping */}
          <div style={{
            marginTop: '2rem',
            padding: '1.25rem',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            borderLeft: '4px solid #0ea5e9'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#0c4a6e',
              marginBottom: '0.5rem'
            }}>
              Note about Free Web Scraping
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#0369a1',
              lineHeight: '1.6',
              margin: 0
            }}>
              Without API keys, the app uses free web scraping to get property data from Domain.com.au
              and Realestate.com.au. This may be slower and less reliable than official APIs, but provides
              basic comparable property data at no cost.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
