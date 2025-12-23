"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HistoricSalesWeights } from "@/lib/types";
import { usePageView } from "@/hooks/useAudit";

export default function HistoricSalesWeightsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<HistoricSalesWeights | null>(null);

  // Track page view for audit
  usePageView('settings-historic-sales-weights');

  useEffect(() => {
    loadWeights();
  }, []);

  const loadWeights = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/historic-sales-weights');
      const data = await response.json();
      if (response.ok) {
        // Add fallback defaults for new fields that might not exist in DB yet
        setWeights({
          ...data,
          distance_ultra_close_bonus: data.distance_ultra_close_bonus ?? 40,
          distance_ultra_close_threshold_km: data.distance_ultra_close_threshold_km ?? 0.2,
        });
      } else {
        toast.error('Failed to load weights configuration');
      }
    } catch (err) {
      console.error('Error loading weights:', err);
      toast.error('Error loading weights configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof HistoricSalesWeights, value: string) => {
    if (!weights) return;
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setWeights({ ...weights, [field]: numValue });
    }
  };

  const handleSave = async () => {
    if (!weights) return;
    try {
      setSaving(true);
      const response = await fetch('/api/historic-sales-weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weights),
      });

      if (response.ok) {
        toast.success('Weights saved successfully');
        await loadWeights();
      } else {
        toast.error('Failed to save weights');
      }
    } catch (err) {
      console.error('Error saving weights:', err);
      toast.error('Error saving weights');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default weights?')) return;
    try {
      setSaving(true);
      const response = await fetch('/api/historic-sales-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'reset_to_defaults' }),
      });

      if (response.ok) {
        toast.success('Weights reset to defaults');
        await loadWeights();
      } else {
        toast.error('Failed to reset weights');
      }
    } catch (err) {
      console.error('Error resetting weights:', err);
      toast.error('Error resetting weights');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100px',
    padding: '0.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.9rem',
    textAlign: 'right' as const,
  };

  const labelStyle = {
    display: 'block',
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: '0.25rem',
    fontSize: '0.9rem',
  };

  const descStyle = {
    fontSize: '0.8rem',
    color: '#6b7280',
    marginBottom: '0.5rem',
  };

  const sectionStyle = {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1rem',
  };

  const sectionTitleStyle = {
    fontSize: '1rem',
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e2e8f0',
  };

  const fieldGroupStyle = {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  };

  const fieldStyle = {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: '0.75rem',
    background: '#f8fafc',
    borderRadius: '8px',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!weights) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', color: '#dc2626', marginBottom: '1rem' }}>Failed to load weights</div>
          <button onClick={loadWeights} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0.75rem 1rem' }}>
        <Link
          href="/settings"
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
          }}
        >
          ← Back to Settings
        </Link>
      </div>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed' }}>
            Historic Sales Matching Weights
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleReset}
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: '500',
              }}
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '0.5rem 1.5rem',
                background: saving ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Configure how comparable properties are scored against the target property. Higher bonuses increase the match score, while penalties decrease it.
        </p>

        {/* Bedroom Matching */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Bedroom Matching</h2>
          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Exact Match Bonus</label>
                <p style={descStyle}>Points added when bedrooms match exactly</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.bedroom_exact_match_bonus}
                onChange={(e) => handleInputChange('bedroom_exact_match_bonus', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Difference Penalty (per bed)</label>
                <p style={descStyle}>Points deducted per bedroom difference</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.bedroom_diff_penalty_per_bed}
                onChange={(e) => handleInputChange('bedroom_diff_penalty_per_bed', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Bathroom Matching */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Bathroom Matching</h2>
          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Exact Match Bonus</label>
                <p style={descStyle}>Points added when bathrooms match exactly</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.bathroom_exact_match_bonus}
                onChange={(e) => handleInputChange('bathroom_exact_match_bonus', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Difference Penalty (per bath)</label>
                <p style={descStyle}>Points deducted per bathroom difference</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.bathroom_diff_penalty_per_bath}
                onChange={(e) => handleInputChange('bathroom_diff_penalty_per_bath', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Property Type / Density */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Property Type Matching</h2>
          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>House to Unit Penalty</label>
                <p style={descStyle}>Penalty for house vs unit mismatch</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.density_house_to_unit_penalty}
                onChange={(e) => handleInputChange('density_house_to_unit_penalty', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>House to Subdivision Penalty</label>
                <p style={descStyle}>Penalty for house vs townhouse/villa</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.density_house_to_subdivision_penalty}
                onChange={(e) => handleInputChange('density_house_to_subdivision_penalty', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Distance */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Distance Scoring</h2>
          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Ultra Close Bonus (0 - {weights.distance_ultra_close_threshold_km * 1000}m)</label>
                <p style={descStyle}>Bonus for properties within {weights.distance_ultra_close_threshold_km * 1000}m</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.distance_ultra_close_bonus}
                onChange={(e) => handleInputChange('distance_ultra_close_bonus', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Ultra Close Threshold (km)</label>
                <p style={descStyle}>Distance for ultra close (default 0.2 = 200m)</p>
              </div>
              <input
                type="number"
                step="0.05"
                style={inputStyle}
                value={weights.distance_ultra_close_threshold_km}
                onChange={(e) => handleInputChange('distance_ultra_close_threshold_km', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Very Close Bonus ({weights.distance_ultra_close_threshold_km * 1000}m - {weights.distance_very_close_threshold_km * 1000}m)</label>
                <p style={descStyle}>Bonus for properties in this range</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.distance_very_close_bonus}
                onChange={(e) => handleInputChange('distance_very_close_bonus', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Very Close Threshold (km)</label>
                <p style={descStyle}>Upper limit for very close (default 0.35 = 350m)</p>
              </div>
              <input
                type="number"
                step="0.05"
                style={inputStyle}
                value={weights.distance_very_close_threshold_km}
                onChange={(e) => handleInputChange('distance_very_close_threshold_km', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Close Bonus ({weights.distance_very_close_threshold_km * 1000}m - {weights.distance_close_threshold_km * 1000}m)</label>
                <p style={descStyle}>Bonus for properties in this range</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.distance_close_bonus}
                onChange={(e) => handleInputChange('distance_close_bonus', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Close Threshold (km)</label>
                <p style={descStyle}>Upper limit for close (default 0.5 = 500m)</p>
              </div>
              <input
                type="number"
                step="0.1"
                style={inputStyle}
                value={weights.distance_close_threshold_km}
                onChange={(e) => handleInputChange('distance_close_threshold_km', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Moderate Penalty ({weights.distance_close_threshold_km * 1000}m - {weights.distance_moderate_threshold_km}km)</label>
                <p style={descStyle}>Penalty for properties in this range</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.distance_moderate_penalty}
                onChange={(e) => handleInputChange('distance_moderate_penalty', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Moderate Threshold (km)</label>
                <p style={descStyle}>Upper limit for moderate distance</p>
              </div>
              <input
                type="number"
                step="0.1"
                style={inputStyle}
                value={weights.distance_moderate_threshold_km}
                onChange={(e) => handleInputChange('distance_moderate_threshold_km', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Far Penalty ({weights.distance_moderate_threshold_km}km - {weights.distance_far_threshold_km}km)</label>
                <p style={descStyle}>Penalty for properties in this range</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.distance_far_penalty}
                onChange={(e) => handleInputChange('distance_far_penalty', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Far Threshold (km)</label>
                <p style={descStyle}>Upper limit for far distance</p>
              </div>
              <input
                type="number"
                step="0.1"
                style={inputStyle}
                value={weights.distance_far_threshold_km}
                onChange={(e) => handleInputChange('distance_far_threshold_km', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Very Far Penalty (&gt; {weights.distance_very_far_threshold_km}km)</label>
                <p style={descStyle}>Penalty for properties beyond {weights.distance_very_far_threshold_km}km</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.distance_very_far_penalty}
                onChange={(e) => handleInputChange('distance_very_far_penalty', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Very Far Threshold (km)</label>
                <p style={descStyle}>Distance considered very far</p>
              </div>
              <input
                type="number"
                step="0.1"
                style={inputStyle}
                value={weights.distance_very_far_threshold_km}
                onChange={(e) => handleInputChange('distance_very_far_threshold_km', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Recency */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Sale Recency Scoring</h2>
          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Very Recent Bonus</label>
                <p style={descStyle}>Bonus for very recent sales</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_very_recent_bonus}
                onChange={(e) => handleInputChange('recency_very_recent_bonus', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Very Recent Threshold (months)</label>
                <p style={descStyle}>Months considered very recent</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_very_recent_threshold_months}
                onChange={(e) => handleInputChange('recency_very_recent_threshold_months', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Recent Bonus</label>
                <p style={descStyle}>Bonus for recent sales</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_recent_bonus}
                onChange={(e) => handleInputChange('recency_recent_bonus', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Recent Threshold (months)</label>
                <p style={descStyle}>Months considered recent</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_recent_threshold_months}
                onChange={(e) => handleInputChange('recency_recent_threshold_months', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Getting Old Penalty</label>
                <p style={descStyle}>Penalty for aging sales</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_getting_old_penalty}
                onChange={(e) => handleInputChange('recency_getting_old_penalty', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Getting Old Threshold (months)</label>
                <p style={descStyle}>Months considered getting old</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_getting_old_threshold_months}
                onChange={(e) => handleInputChange('recency_getting_old_threshold_months', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Old Penalty</label>
                <p style={descStyle}>Penalty for old sales</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_old_penalty}
                onChange={(e) => handleInputChange('recency_old_penalty', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Old Threshold (months)</label>
                <p style={descStyle}>Months considered old</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_old_threshold_months}
                onChange={(e) => handleInputChange('recency_old_threshold_months', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Very Old Penalty</label>
                <p style={descStyle}>Penalty for very old sales</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_very_old_penalty}
                onChange={(e) => handleInputChange('recency_very_old_penalty', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Very Old Threshold (months)</label>
                <p style={descStyle}>Months considered very old</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.recency_very_old_threshold_months}
                onChange={(e) => handleInputChange('recency_very_old_threshold_months', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Land Area */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Land Area Matching (Future Use)</h2>
          <div style={fieldGroupStyle}>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Land Area Weight</label>
                <p style={descStyle}>Weight for land area similarity (0-1)</p>
              </div>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                style={inputStyle}
                value={weights.land_area_weight}
                onChange={(e) => handleInputChange('land_area_weight', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <div>
                <label style={labelStyle}>Land Area Tolerance (%)</label>
                <p style={descStyle}>Acceptable variance percentage</p>
              </div>
              <input
                type="number"
                style={inputStyle}
                value={weights.land_area_tolerance_percent}
                onChange={(e) => handleInputChange('land_area_tolerance_percent', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Info Box */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '1rem',
          marginTop: '1rem',
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#166534', marginBottom: '0.5rem' }}>
            How Scoring Works
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#15803d', lineHeight: '1.5', margin: 0 }}>
            Each comparable property starts with a base score of 100. Bonuses are added for exact matches and close proximity,
            while penalties are applied for differences in bedrooms, bathrooms, property type, distance, and sale age.
            The final score is clamped between 0-100.
          </p>
        </div>

        {/* ML Note */}
        <div style={{
          background: '#faf5ff',
          border: '1px solid #e9d5ff',
          borderRadius: '12px',
          padding: '1rem',
          marginTop: '1rem',
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#7c3aed', marginBottom: '0.5rem' }}>
            Future: Machine Learning Optimization
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#6b21a8', lineHeight: '1.5', margin: 0 }}>
            These weights can be optimized using machine learning. By marking the "best match" property manually,
            the system can learn to reverse-engineer optimal weights that produce similar rankings automatically.
          </p>
        </div>
      </main>
    </div>
  );
}
