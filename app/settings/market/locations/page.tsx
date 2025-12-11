'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Save, Trash2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/lib/config';
import { usePageView } from '@/hooks/useAudit';

interface MarketLocation {
  id?: string;
  name: string;
  state: string;
  type: 'suburb' | 'town' | 'region' | 'lga';
  housing_shortage: number;
  growth_rate: number;
  median_price: number;
  rental_vacancy: number;
  days_on_market: number;
  notes: string;
  active: boolean;
}

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

export default function MarketLocationsPage() {
  const [locations, setLocations] = useState<MarketLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<string>('');

  // Track page view for audit
  usePageView('settings-market-locations');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await fetch(`${API}/settings/market-locations`);
      const data = await response.json();

      if (data.success && data.locations) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLocation = () => {
    const newLocation: MarketLocation = {
      name: '',
      state: 'NSW',
      type: 'suburb',
      housing_shortage: 0,
      growth_rate: 0,
      median_price: 0,
      rental_vacancy: 0,
      days_on_market: 0,
      notes: '',
      active: true
    };
    setLocations([newLocation, ...locations]);
  };

  const removeLocation = (index: number) => {
    const updated = locations.filter((_, i) => i !== index);
    setLocations(updated);
  };

  const updateLocation = (index: number, field: keyof MarketLocation, value: any) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  const saveAll = async () => {
    // Validate that all locations have names
    const invalidLocations = locations.filter(loc => !loc.name.trim());
    if (invalidLocations.length > 0) {
      toast.error('Please provide a name for all locations');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API}/settings/market-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Locations saved successfully!');
        await loadLocations();
      } else {
        toast.error('Failed to save locations');
      }
    } catch (error) {
      console.error('Failed to save locations:', error);
      toast.error('Failed to save locations');
    } finally {
      setSaving(false);
    }
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          loc.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = !filterState || loc.state === filterState;
    return matchesSearch && matchesState;
  });

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
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/settings/market"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium border border-gray-200 px-3 py-1.5 rounded-lg"
            >
              ← Back to Market Settings
            </Link>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addLocation}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Location
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-8 h-8 text-cyan-500" />
          <h1 className="text-3xl font-bold text-gray-900">Location-Specific Market Data</h1>
        </div>
        <p className="text-gray-600 mb-8">
          Add specific towns, suburbs, or regions with their own market data for more accurate property evaluations.
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">How Location Data Works</h3>
          <p className="text-blue-700 text-sm">
            When evaluating a property, the system first checks for location-specific data. If a match is found
            (e.g., &quot;Townsville&quot; for a Townsville property), those specific values are used instead of state-level
            defaults. This allows for hyper-local accuracy in areas with significant market variations.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All States</option>
            {STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        {/* Locations List */}
        <div className="space-y-4">
          {filteredLocations.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
              {locations.length === 0 ? (
                <>
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No locations configured yet.</p>
                  <button
                    onClick={addLocation}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Location
                  </button>
                </>
              ) : (
                <p className="text-gray-500">No locations match your search criteria.</p>
              )}
            </div>
          ) : (
            filteredLocations.map((location, index) => {
              const actualIndex = locations.findIndex(l => l === location);
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${location.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="font-semibold text-gray-900">
                        {location.name || 'New Location'}
                      </span>
                      {location.state && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded">
                          {location.state}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeLocation(actualIndex)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location Name *
                      </label>
                      <input
                        type="text"
                        value={location.name}
                        onChange={(e) => updateLocation(actualIndex, 'name', e.target.value)}
                        placeholder="e.g., Townsville"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <select
                        value={location.state}
                        onChange={(e) => updateLocation(actualIndex, 'state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        {STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={location.type}
                        onChange={(e) => updateLocation(actualIndex, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="suburb">Suburb</option>
                        <option value="town">Town</option>
                        <option value="region">Region</option>
                        <option value="lga">LGA</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={location.active}
                          onChange={(e) => updateLocation(actualIndex, 'active', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Housing Shortage
                      </label>
                      <input
                        type="number"
                        value={location.housing_shortage || ''}
                        onChange={(e) => updateLocation(actualIndex, 'housing_shortage', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Growth Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={location.growth_rate || ''}
                        onChange={(e) => updateLocation(actualIndex, 'growth_rate', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Median Price ($)
                      </label>
                      <input
                        type="number"
                        value={location.median_price || ''}
                        onChange={(e) => updateLocation(actualIndex, 'median_price', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vacancy Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={location.rental_vacancy || ''}
                        onChange={(e) => updateLocation(actualIndex, 'rental_vacancy', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Days on Market
                      </label>
                      <input
                        type="number"
                        value={location.days_on_market || ''}
                        onChange={(e) => updateLocation(actualIndex, 'days_on_market', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={location.notes}
                      onChange={(e) => updateLocation(actualIndex, 'notes', e.target.value)}
                      placeholder="Optional notes about this location..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary Stats */}
        {locations.length > 0 && (
          <div className="mt-8 bg-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Total Locations: {locations.length}</span>
              <span>Active: {locations.filter(l => l.active).length}</span>
              <span>
                States: {[...new Set(locations.map(l => l.state))].join(', ')}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
