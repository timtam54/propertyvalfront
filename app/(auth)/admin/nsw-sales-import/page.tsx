'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle,
  Loader2, Trash2, BarChart3, MapPin, DollarSign, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/lib/config';
import { usePageView } from '@/hooks/useAudit';

interface PreviewData {
  sheetName: string;
  headers: string[];
  totalRows: number;
  validRows: number;
  preview: {
    address: string;
    suburb: string;
    postcode: string;
    price: number | null;
    size: number | null;
    saleDate: string | null;
    propertyType: string;
    zoning: string;
  }[];
  stats: {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    uniqueSuburbs: number;
    uniquePostcodes: number;
  };
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  total: number;
  suburbsProcessed?: number;
  errors?: string[];
}

export default function NSWSalesImportPage() {
  usePageView('admin-nsw-sales-import');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewData(null);
      setImportResult(null);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) return;

    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API}/nsw-sales/preview`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setPreviewData(data);
        toast.success('Preview generated successfully');
      } else {
        toast.error(data.detail || 'Failed to preview file');
      }
    } catch (error: any) {
      toast.error('Error previewing file: ' + error.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API}/nsw-sales/import`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setImportResult(data);
        toast.success(`Successfully imported ${data.imported} records`);
      } else {
        toast.error(data.detail || 'Failed to import file');
      }
    } catch (error: any) {
      toast.error('Error importing file: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to delete all imported NSW sales data? This cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const response = await fetch(`${API}/nsw-sales/clear`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Deleted ${data.deleted} records`);
        setImportResult(null);
        setPreviewData(null);
      } else {
        toast.error(data.detail || 'Failed to clear data');
      }
    } catch (error: any) {
      toast.error('Error clearing data: ' + error.message);
    } finally {
      setClearing(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Admin</span>
              </Link>
              <div className="h-6 w-px bg-slate-700" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-slate-900" />
                </div>
                <h1 className="text-xl font-bold text-white">NSW Property Sales Import</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Import NSW Property Sales Data</h3>
            <p className="text-blue-700 mb-4">
              Upload an Excel file containing NSW property sales data (e.g., from NSW Valuer General).
              Data is stored alongside cached property searches for use as comparables.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-800">
              <span className="bg-blue-100 px-2 py-1 rounded">District Code</span>
              <span className="bg-blue-100 px-2 py-1 rounded">Property ID</span>
              <span className="bg-blue-100 px-2 py-1 rounded">House Number</span>
              <span className="bg-blue-100 px-2 py-1 rounded">Street</span>
              <span className="bg-blue-100 px-2 py-1 rounded">Suburb</span>
              <span className="bg-blue-100 px-2 py-1 rounded">Postcode</span>
              <span className="bg-blue-100 px-2 py-1 rounded">Purchase Price</span>
              <span className="bg-blue-100 px-2 py-1 rounded">Contract Date</span>
            </div>
            <p className="text-blue-600 text-sm mt-3">
              Source: <strong>nsw-valuer-general</strong> | Stored in: <strong>historic_prop</strong> table
            </p>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Excel File</h3>

            <div className="space-y-4">
              {/* File Input */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  selectedFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500 mt-1">Excel files (.xlsx, .xls) up to 100MB</p>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              {selectedFile && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handlePreview}
                    disabled={previewing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    {previewing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BarChart3 className="w-4 h-4" />
                    )}
                    Preview Data
                  </button>

                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {importing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {importing ? 'Importing...' : 'Import to Database'}
                  </button>

                  <button
                    onClick={handleClear}
                    disabled={clearing}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors ml-auto"
                  >
                    {clearing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Clear Imported Data
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview Results */}
          {previewData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Preview: {previewData.sheetName}</h3>
                <p className="text-sm text-gray-500">
                  {previewData.totalRows.toLocaleString()} total rows, {previewData.validRows.toLocaleString()} valid for import
                </p>
              </div>

              {/* Stats */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <DollarSign className="w-3 h-3" />
                      Avg Price
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(previewData.stats.avgPrice)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <DollarSign className="w-3 h-3" />
                      Min Price
                    </div>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatPrice(previewData.stats.minPrice)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <DollarSign className="w-3 h-3" />
                      Max Price
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      {formatPrice(previewData.stats.maxPrice)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <MapPin className="w-3 h-3" />
                      Suburbs
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {previewData.stats.uniqueSuburbs}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                      <MapPin className="w-3 h-3" />
                      Postcodes
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {previewData.stats.uniquePostcodes}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suburb</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Postcode</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size (m²)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{row.address}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.suburb}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.postcode}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                          {formatPrice(row.price)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.size || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.saleDate || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800">
                            {row.propertyType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-gray-50 text-center text-sm text-gray-500">
                Showing first 10 records of {previewData.validRows.toLocaleString()} valid records
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className={`rounded-xl p-6 ${
              importResult.success ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-red-50 border-2 border-red-200'
            }`}>
              <div className="flex items-start gap-4">
                {importResult.success ? (
                  <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${importResult.success ? 'text-emerald-900' : 'text-red-900'}`}>
                    {importResult.success ? 'Import Complete' : 'Import Failed'}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Records</p>
                      <p className="text-2xl font-bold text-gray-900">{importResult.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Imported</p>
                      <p className="text-2xl font-bold text-emerald-600">{importResult.imported.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Skipped</p>
                      <p className="text-2xl font-bold text-orange-600">{importResult.skipped.toLocaleString()}</p>
                    </div>
                    {importResult.suburbsProcessed && (
                      <div>
                        <p className="text-sm text-gray-500">Suburbs</p>
                        <p className="text-2xl font-bold text-cyan-600">{importResult.suburbsProcessed.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
