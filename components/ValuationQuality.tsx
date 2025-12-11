'use client';

import { useState } from 'react';
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info,
  BarChart3, Calendar, MapPin, Home, DollarSign, Clock,
  ChevronDown, ChevronUp, Target, Activity
} from 'lucide-react';
import type {
  ValuationHistoryEntry,
  ConfidenceScoring,
  SuburbMarketTrends,
  ComparableProperty
} from '@/lib/types';

interface ValuationQualityProps {
  valuationHistory?: ValuationHistoryEntry[];
  confidenceScoring?: ConfidenceScoring | null;
  suburbTrends?: SuburbMarketTrends | null;
  comparables?: ComparableProperty[];
  selectedComparables?: string[];
  onComparableToggle?: (id: string) => void;
  onRecalculate?: (selectedIds: string[]) => void;
  currentValue?: number;
}

// Confidence Score Badge
function ConfidenceBadge({ score, level }: { score: number; level: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    low: 'bg-red-100 text-red-800 border-red-300'
  };

  const icons = {
    high: <CheckCircle className="w-4 h-4" />,
    medium: <AlertCircle className="w-4 h-4" />,
    low: <AlertCircle className="w-4 h-4" />
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors[level]}`}>
      {icons[level]}
      <span className="font-semibold">{score}%</span>
      <span className="text-sm capitalize">{level} Confidence</span>
    </div>
  );
}

// Historical Price Chart (simple bar visualization)
function PriceHistoryChart({ history }: { history: ValuationHistoryEntry[] }) {
  if (!history || history.length === 0) return null;

  const maxValue = Math.max(...history.map(h => h.value_high));
  const minValue = Math.min(...history.map(h => h.value_low));
  const range = maxValue - minValue || 1;

  return (
    <div className="space-y-2">
      {history.slice(-6).map((entry, idx) => {
        const lowPercent = ((entry.value_low - minValue) / range) * 100;
        const highPercent = ((entry.value_high - minValue) / range) * 100;
        const valuePercent = ((entry.estimated_value - minValue) / range) * 100;

        return (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-20 text-xs text-gray-500 flex-shrink-0">
              {new Date(entry.date).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}
            </div>
            <div className="flex-1 h-6 bg-gray-100 rounded relative">
              {/* Range bar */}
              <div
                className="absolute h-full bg-blue-200 rounded"
                style={{
                  left: `${lowPercent}%`,
                  width: `${highPercent - lowPercent}%`
                }}
              />
              {/* Value marker */}
              <div
                className="absolute w-2 h-full bg-blue-600 rounded"
                style={{ left: `${valuePercent}%` }}
              />
            </div>
            <div className="w-24 text-xs font-medium text-gray-700 text-right flex-shrink-0">
              ${(entry.estimated_value / 1000).toFixed(0)}K
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Suburb Trends Section
function SuburbTrendsSection({ trends }: { trends: SuburbMarketTrends }) {
  const [expanded, setExpanded] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">
              {trends.suburb}, {trends.state} Market Trends
            </h3>
            <p className="text-sm text-gray-500">
              Updated {new Date(trends.last_updated).toLocaleDateString('en-AU')}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-4 border-t border-gray-100">
          {/* Key metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Median Price
              </div>
              <div className="text-xl font-bold text-gray-900">{formatPrice(trends.median_price)}</div>
              <div className={`text-sm flex items-center gap-1 ${trends.median_price_change_12m >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {trends.median_price_change_12m >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatChange(trends.median_price_change_12m)} (12m)
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Days on Market
              </div>
              <div className="text-xl font-bold text-gray-900">{trends.days_on_market}</div>
              <div className={`text-sm ${trends.days_on_market_change <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {trends.days_on_market_change <= 0 ? 'Faster' : 'Slower'} than avg
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Target className="w-4 h-4" />
                Clearance Rate
              </div>
              <div className="text-xl font-bold text-gray-900">{trends.auction_clearance_rate}%</div>
              <div className="text-sm text-gray-500">Auction success</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Activity className="w-4 h-4" />
                Sales (12m)
              </div>
              <div className="text-xl font-bold text-gray-900">{trends.total_sales_12m}</div>
              <div className="text-sm text-gray-500">Properties sold</div>
            </div>
          </div>

          {/* Historical price chart */}
          {trends.historical_prices && trends.historical_prices.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3">Price History</h4>
              <div className="h-32 flex items-end gap-1">
                {trends.historical_prices.map((period, idx) => {
                  const maxPrice = Math.max(...trends.historical_prices.map(p => p.median_price));
                  const height = (period.median_price / maxPrice) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {formatPrice(period.median_price)} ({period.sales_count} sales)
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{period.period}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Property type breakdown */}
          {trends.property_type_breakdown && trends.property_type_breakdown.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3">By Property Type</h4>
              <div className="space-y-2">
                {trends.property_type_breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{item.type}</span>
                      <span className="text-xs text-gray-400">({item.count} sales)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatPrice(item.median_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Confidence Scoring Breakdown
function ConfidenceBreakdown({ scoring }: { scoring: ConfidenceScoring }) {
  const [expanded, setExpanded] = useState(false);

  const factorOrder = ['comparables_count', 'data_recency', 'location_match', 'property_similarity', 'price_consistency'] as const;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ConfidenceBadge score={scoring.overall_score} level={scoring.level} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">View breakdown</span>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 border-t border-gray-100">
          {/* Factor breakdown */}
          <div className="space-y-3 mb-4">
            {factorOrder.map((key) => {
              const factor = scoring.factors[key];
              const barColor = factor.score >= 70 ? 'bg-emerald-500' : factor.score >= 40 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">{factor.description}</span>
                    <span className="text-sm font-medium text-gray-900">{factor.score}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          {scoring.recommendations && scoring.recommendations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                <Info className="w-4 h-4" />
                Recommendations to improve confidence
              </div>
              <ul className="space-y-1">
                {scoring.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Comparable Selection Component
function ComparableSelection({
  comparables,
  selectedIds,
  onToggle,
  onRecalculate
}: {
  comparables: ComparableProperty[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onRecalculate: () => void;
}) {
  const [expanded, setExpanded] = useState(true); // Start expanded to show comparables

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    return `$${(price / 1000).toFixed(0)}K`;
  };

  // Get data source from first comparable
  const dataSource = comparables[0]?.source || 'Market Data';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Home className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">
              Comparable Sales from {dataSource.includes('Homely') ? 'Homely.com.au' : dataSource.includes('Realestate') ? 'realestate.com.au' : dataSource.includes('Domain') ? 'Domain.com.au' : dataSource}
            </h3>
            <p className="text-sm text-gray-500">
              {comparables.length} similar properties found • {selectedIds.length} selected for valuation
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <p className="text-sm text-gray-600 mb-3">
              Select the comparables you want to include in the valuation. Deselect any that aren't relevant.
            </p>
            <button
              onClick={onRecalculate}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Recalculate with {selectedIds.length} Selected
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {comparables.map((comp) => {
              const isSelected = selectedIds.includes(comp.id);
              return (
                <div
                  key={comp.id}
                  onClick={() => onToggle(comp.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? 'bg-purple-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 truncate">{comp.address}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>{comp.beds} bed</span>
                            <span>{comp.baths} bath</span>
                            {comp.carpark && <span>{comp.carpark} car</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-emerald-600">{formatPrice(comp.price)}</p>
                          {comp.sold_date && (
                            <p className="text-xs text-gray-500">{comp.sold_date}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {comp.similarity_score && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            comp.similarity_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            comp.similarity_score >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {comp.similarity_score}% match
                          </span>
                        )}
                        {comp.distance_km && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {comp.distance_km.toFixed(1)}km away
                          </span>
                        )}
                        {comp.source && (
                          <span className="text-xs text-gray-400">{comp.source}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Main ValuationQuality Component
export default function ValuationQuality({
  valuationHistory,
  confidenceScoring,
  suburbTrends,
  comparables,
  selectedComparables,
  onComparableToggle,
  onRecalculate,
  currentValue
}: ValuationQualityProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(
    selectedComparables || comparables?.map(c => c.id) || []
  );

  const handleToggle = (id: string) => {
    setLocalSelected(prev => {
      const newSelected = prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id];
      onComparableToggle?.(id);
      return newSelected;
    });
  };

  const handleRecalculate = () => {
    onRecalculate?.(localSelected);
  };

  return (
    <div className="space-y-4">
      {/* Confidence Scoring */}
      {confidenceScoring && (
        <ConfidenceBreakdown scoring={confidenceScoring} />
      )}

      {/* Valuation History */}
      {valuationHistory && valuationHistory.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Valuation History</h3>
              <p className="text-sm text-gray-500">{valuationHistory.length} valuations recorded</p>
            </div>
          </div>
          <PriceHistoryChart history={valuationHistory} />

          {/* Current vs Previous */}
          {valuationHistory.length >= 2 && currentValue && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Change since last valuation</span>
                {(() => {
                  const prev = valuationHistory[valuationHistory.length - 2].estimated_value;
                  const change = ((currentValue - prev) / prev) * 100;
                  const isUp = change >= 0;
                  return (
                    <span className={`flex items-center gap-1 font-medium ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {isUp ? '+' : ''}{change.toFixed(1)}%
                    </span>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suburb Market Trends */}
      {suburbTrends && (
        <SuburbTrendsSection trends={suburbTrends} />
      )}

      {/* Comparable Selection */}
      {comparables && comparables.length > 0 && (
        <ComparableSelection
          comparables={comparables}
          selectedIds={localSelected}
          onToggle={handleToggle}
          onRecalculate={handleRecalculate}
        />
      )}
    </div>
  );
}
