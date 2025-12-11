'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/lib/config';
import { usePageView } from '@/hooks/useAudit';

interface Inclusion {
  text: string;
  price: number;
}

interface MarketingPackage {
  id?: string;
  name: string;
  price: number;
  description: string;
  inclusions: Inclusion[];
  order: number;
  active: boolean;
}

export default function MarketingPackagesPage() {
  const [packages, setPackages] = useState<MarketingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Track page view for audit
  usePageView('settings-marketing');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const response = await fetch(`${API}/marketing-packages`);
      const data = await response.json();

      if (data.success && data.packages) {
        setPackages(data.packages);
      }
    } catch (error) {
      console.error('Failed to load packages:', error);
      toast.error('Failed to load marketing packages');
    } finally {
      setLoading(false);
    }
  };

  const addPackage = () => {
    const newPackage: MarketingPackage = {
      name: '',
      price: 0,
      description: '',
      inclusions: [{ text: '', price: 0 }],
      order: packages.length + 1,
      active: true
    };
    setPackages([...packages, newPackage]);
  };

  const removePackage = (index: number) => {
    const updated = packages.filter((_, i) => i !== index);
    setPackages(updated);
  };

  const updatePackage = (index: number, field: keyof MarketingPackage, value: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate price from inclusions
    if (field === 'inclusions') {
      const totalPrice = value.reduce((sum: number, inc: Inclusion) => sum + (inc.price || 0), 0);
      updated[index].price = totalPrice;
    }

    setPackages(updated);
  };

  const addInclusion = (packageIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].inclusions.push({ text: '', price: 0 });
    setPackages(updated);
  };

  const removeInclusion = (packageIndex: number, inclusionIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].inclusions = updated[packageIndex].inclusions.filter((_, i) => i !== inclusionIndex);

    // Recalculate price
    const totalPrice = updated[packageIndex].inclusions.reduce((sum, inc) => sum + (inc.price || 0), 0);
    updated[packageIndex].price = totalPrice;

    setPackages(updated);
  };

  const updateInclusion = (packageIndex: number, inclusionIndex: number, field: keyof Inclusion, value: any) => {
    const updated = [...packages];
    updated[packageIndex].inclusions[inclusionIndex] = {
      ...updated[packageIndex].inclusions[inclusionIndex],
      [field]: field === 'price' ? Number(value) || 0 : value
    };

    // Recalculate price
    const totalPrice = updated[packageIndex].inclusions.reduce((sum, inc) => sum + (inc.price || 0), 0);
    updated[packageIndex].price = totalPrice;

    setPackages(updated);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/marketing-packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Marketing packages saved successfully!');
        await loadPackages();
      } else {
        toast.error('Failed to save packages');
      }
    } catch (error) {
      console.error('Failed to save packages:', error);
      toast.error('Failed to save packages');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
            >
              ← Back to Settings
            </Link>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">Marketing Packages</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configure Marketing Packages</h1>
          <div className="flex gap-3">
            <button
              onClick={addPackage}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Package
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>

        {/* Packages List */}
        <div className="space-y-6">
          {packages.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500 mb-4">No marketing packages configured yet.</p>
              <button
                onClick={addPackage}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Your First Package
              </button>
            </div>
          ) : (
            packages.map((pkg, pkgIndex) => (
              <div
                key={pkgIndex}
                className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Package {pkgIndex + 1}</h2>
                  <button
                    onClick={() => removePackage(pkgIndex)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Package Name
                    </label>
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => updatePackage(pkgIndex, 'name', e.target.value)}
                      placeholder="Tier 1"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Price (Auto-Calculated)
                    </label>
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-cyan-600 font-semibold">
                      {pkg.price.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={pkg.description}
                    onChange={(e) => updatePackage(pkgIndex, 'description', e.target.value)}
                    placeholder="Basic"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Inclusions
                    </label>
                    <button
                      onClick={() => addInclusion(pkgIndex)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 text-white text-sm rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {pkg.inclusions.map((inclusion, incIndex) => (
                      <div key={incIndex} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={inclusion.text}
                          onChange={(e) => updateInclusion(pkgIndex, incIndex, 'text', e.target.value)}
                          placeholder="[Online Marketing]"
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={inclusion.price || ''}
                            onChange={(e) => updateInclusion(pkgIndex, incIndex, 'price', e.target.value)}
                            placeholder="1000"
                            className="w-32 pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => removeInclusion(pkgIndex, incIndex)}
                          className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
