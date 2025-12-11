'use client';

import { useState } from 'react';
import { Download, X, FileText, Check, AlertCircle, Loader } from 'lucide-react';
import { generateEvaluationPDF } from '@/utils/pdfGenerator';

interface Property {
  id: string;
  location: string;
  beds: number;
  baths: number;
  carpark: number;
  price?: number | null;
  evaluation_report?: string | null;
  evaluation_date?: string | null;
}

interface BatchExportProps {
  properties: Property[];
  onClose: () => void;
}

export default function BatchExport({ properties, onClose }: BatchExportProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    properties.filter(p => p.evaluation_report).map(p => p.id)
  );
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const propertiesWithEval = properties.filter(p => p.evaluation_report);
  const propertiesWithoutEval = properties.filter(p => !p.evaluation_report);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(propertiesWithEval.map(p => p.id));
  };

  const selectNone = () => {
    setSelectedIds([]);
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) return;

    setExporting(true);
    setError(null);
    setExportProgress(0);

    try {
      // Fetch full property data for selected properties (use Next.js API route)
      const response = await fetch('/api/properties/batch-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_ids: selectedIds })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property data');
      }

      const data = await response.json();
      const propertiesToExport = data.properties;

      // Generate PDFs one by one
      for (let i = 0; i < propertiesToExport.length; i++) {
        const prop = propertiesToExport[i];
        setExportProgress(Math.round(((i + 1) / propertiesToExport.length) * 100));

        // Small delay between exports to prevent browser issues
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
          // Calculate price per sqm if available
          const pricePerSqm = prop.price && prop.size
            ? Math.round(prop.price / prop.size)
            : undefined;

          generateEvaluationPDF(
            prop,
            prop.evaluation_report,
            prop.comparables_data,
            pricePerSqm
          );
        } catch (pdfError) {
          console.error(`Error generating PDF for ${prop.location}:`, pdfError);
        }
      }

      // Close after a short delay to show completion
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (err: any) {
      console.error('Batch export error:', err);
      setError(err.message || 'Failed to export properties');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Batch PDF Export</h2>
              <p className="text-sm text-gray-500">
                Export multiple valuation reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={exporting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-180px)]">
          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">
              {selectedIds.length} of {propertiesWithEval.length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Select all
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={selectNone}
                className="text-sm text-blue-600 hover:underline"
              >
                Select none
              </button>
            </div>
          </div>

          {/* Property List */}
          <div className="space-y-2 mb-4">
            {propertiesWithEval.map(property => (
              <label
                key={property.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedIds.includes(property.id)
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(property.id)}
                  onChange={() => toggleSelect(property.id)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {property.location}
                  </p>
                  <p className="text-xs text-gray-500">
                    {property.beds} bed • {property.baths} bath • {property.carpark} car
                    {property.price && ` • $${property.price.toLocaleString()}`}
                  </p>
                </div>
                <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              </label>
            ))}
          </div>

          {/* Properties without evaluations */}
          {propertiesWithoutEval.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {propertiesWithoutEval.length} properties without evaluations
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    These cannot be exported: {propertiesWithoutEval.slice(0, 3).map(p => p.location.split(',')[0]).join(', ')}
                    {propertiesWithoutEval.length > 3 && ` and ${propertiesWithoutEval.length - 3} more`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {exporting ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating PDFs...
                </span>
                <span className="font-medium text-emerald-600">{exportProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={selectedIds.length === 0}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export {selectedIds.length} PDF{selectedIds.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
