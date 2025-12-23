'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/lib/config';
import { usePageView } from '@/hooks/useAudit';

interface MarketContext {
  rba_interest_rate: number;
  housing_shortage_national: number;
  housing_shortage_nsw: number;
  housing_shortage_vic: number;
  housing_shortage_qld: number;
  housing_shortage_wa: number;
  housing_shortage_sa: number;
  annual_growth_rate_min: number;
  annual_growth_rate_max: number;
  net_migration: number;
  construction_shortfall: number;
  rental_vacancy_rate: number;
  auction_clearance_rate: number;
  days_on_market: number;
  scarcity_premium_min: number;
  scarcity_premium_max: number;
  last_updated?: string;
}

export default function MarketContextPage() {
  const [context, setContext] = useState<MarketContext>({
    rba_interest_rate: 4.35,
    housing_shortage_national: 175000,
    housing_shortage_nsw: 70000,
    housing_shortage_vic: 60000,
    housing_shortage_qld: 30000,
    housing_shortage_wa: 15000,
    housing_shortage_sa: 10000,
    annual_growth_rate_min: 8,
    annual_growth_rate_max: 12,
    net_migration: 400000,
    construction_shortfall: 50000,
    rental_vacancy_rate: 1.5,
    auction_clearance_rate: 70,
    days_on_market: 28,
    scarcity_premium_min: 15,
    scarcity_premium_max: 25
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Track page view for audit
  usePageView('settings-market');

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    try {
      const response = await fetch(`${API}/settings/market-context`);
      const data = await response.json();

      if (data.success && data.context) {
        setContext(data.context);
        if (data.context.last_updated) {
          setLastUpdated(data.context.last_updated);
        }
      }
    } catch (error) {
      console.error('Failed to load market context:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof MarketContext, value: string) => {
    setContext(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const fetchLiveRate = async () => {
    setFetchingRate(true);
    try {
      // Try to fetch from RBA or use a mock
      const response = await fetch(`${API}/settings/fetch-rba-rate`);
      const data = await response.json();

      if (data.success && data.rate) {
        setContext(prev => ({ ...prev, rba_interest_rate: data.rate }));
        toast.success(`RBA rate updated to ${data.rate}%`);
      } else {
        toast.error('Could not fetch live rate');
      }
    } catch (error) {
      toast.error('Failed to fetch live rate');
    } finally {
      setFetchingRate(false);
    }
  };

  const saveContext = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/settings/market-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Market context saved successfully!');
        setLastUpdated(new Date().toISOString());
      } else {
        toast.error('Failed to save market context');
      }
    } catch (error) {
      toast.error('Failed to save market context');
    } finally {
      setSaving(false);
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    return `Updated ${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            ← Back to Settings
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-cyan-600 mb-4">Market Context Settings</h1>

        {/* Last Updated Badge */}
        {lastUpdated && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-8 inline-block">
            <span className="text-green-700">✓ {formatLastUpdated()}</span>
          </div>
        )}

        {/* Location-Specific Market Data */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-cyan-600 mb-2 flex items-center gap-2">
            📍 Location-Specific Market Data
          </h2>
          <p className="text-gray-700 mb-4">
            Add specific towns/suburbs for hyper-local shortage data. Example: If QLD has 30,000 shortage
            but 90% is in Townsville, add Townsville with 27,000 homes for more accurate local evaluations.
          </p>
          <Link
            href="/settings/market/locations"
            className="inline-block bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            Manage Locations →
          </Link>
        </div>

        {/* Why Update Market Data */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Update Market Data?</h2>
          <p className="text-gray-600 mb-4">
            Property valuations in 1 year will automatically reflect current market prices through web scraping.
            However, these context settings ensure evaluations consider the latest economic conditions,
            interest rates, and housing shortage data for maximum accuracy.
          </p>

          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
            <h3 className="text-cyan-700 font-semibold mb-2">Update Frequency Recommendations:</h3>
            <ul className="text-gray-700 space-y-1 ml-4">
              <li>RBA Interest Rate: Monthly (or when RBA announces changes)</li>
              <li>Housing Shortage Data: Quarterly</li>
              <li>Market Statistics: Quarterly</li>
              <li>Migration & Construction: Annually</li>
            </ul>
          </div>
        </div>

        {/* Interest Rate Environment */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-cyan-600 mb-4">Interest Rate Environment</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              RBA Cash Rate (%)
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Current Reserve Bank of Australia cash rate target
            </p>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                value={context.rba_interest_rate}
                onChange={(e) => handleChange('rba_interest_rate', e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={fetchLiveRate}
                disabled={fetchingRate}
                className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${fetchingRate ? 'animate-spin' : ''}`} />
                Fetch Live Rate
              </button>
            </div>
          </div>
        </div>

        {/* Housing Shortage Data */}
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-amber-800 mb-4">Housing Shortage Data</h2>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              National Housing Deficit (homes)
            </label>
            <input
              type="number"
              value={context.housing_shortage_national}
              onChange={(e) => handleChange('housing_shortage_national', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">NSW Shortage</label>
              <input
                type="number"
                value={context.housing_shortage_nsw}
                onChange={(e) => handleChange('housing_shortage_nsw', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">VIC Shortage</label>
              <input
                type="number"
                value={context.housing_shortage_vic}
                onChange={(e) => handleChange('housing_shortage_vic', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">QLD Shortage</label>
              <input
                type="number"
                value={context.housing_shortage_qld}
                onChange={(e) => handleChange('housing_shortage_qld', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">WA Shortage</label>
              <input
                type="number"
                value={context.housing_shortage_wa}
                onChange={(e) => handleChange('housing_shortage_wa', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">SA Shortage</label>
              <input
                type="number"
                value={context.housing_shortage_sa}
                onChange={(e) => handleChange('housing_shortage_sa', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Annual Construction Shortfall (homes/year)
            </label>
            <input
              type="number"
              value={context.construction_shortfall}
              onChange={(e) => handleChange('construction_shortfall', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Market Statistics */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Market Statistics</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Annual Growth Rate Min (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={context.annual_growth_rate_min}
                onChange={(e) => handleChange('annual_growth_rate_min', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Annual Growth Rate Max (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={context.annual_growth_rate_max}
                onChange={(e) => handleChange('annual_growth_rate_max', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Rental Vacancy Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={context.rental_vacancy_rate}
                onChange={(e) => handleChange('rental_vacancy_rate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Auction Clearance Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={context.auction_clearance_rate}
                onChange={(e) => handleChange('auction_clearance_rate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Average Days on Market
            </label>
            <input
              type="number"
              value={context.days_on_market}
              onChange={(e) => handleChange('days_on_market', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Demographics & Premiums */}
        <div className="bg-purple-50 border-l-4 border-purple-400 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">Demographics & Premiums</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Net Migration (annual)
              </label>
              <input
                type="number"
                value={context.net_migration}
                onChange={(e) => handleChange('net_migration', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Scarcity Premium Min (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={context.scarcity_premium_min}
                onChange={(e) => handleChange('scarcity_premium_min', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Scarcity Premium Max (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={context.scarcity_premium_max}
              onChange={(e) => handleChange('scarcity_premium_max', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="text-center">
          <button
            onClick={saveContext}
            disabled={saving}
            className="px-8 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Market Context'}
          </button>
        </div>
      </main>
    </div>
  );
}
