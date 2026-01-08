"use client";

import { useState } from "react";
import { X, FileText, Database, AlertCircle, CheckCircle2 } from "lucide-react";

interface EvaluationSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (source: "homely" | "reports" | "all") => void;
  hasRpData: boolean;
  hasAdditionalReport: boolean;
  rpDataHasEstimates: boolean;
  additionalReportHasEstimates: boolean;
}

export default function EvaluationSourceModal({
  isOpen,
  onClose,
  onConfirm,
  hasRpData,
  hasAdditionalReport,
  rpDataHasEstimates,
  additionalReportHasEstimates,
}: EvaluationSourceModalProps) {
  const [selectedSource, setSelectedSource] = useState<"homely" | "reports" | "all" | null>(null);

  if (!isOpen) return null;

  const hasReports = hasRpData || hasAdditionalReport;
  const hasEstimates = rpDataHasEstimates || additionalReportHasEstimates;

  const handleConfirm = () => {
    if (selectedSource) {
      onConfirm(selectedSource);
      setSelectedSource(null);
    }
  };

  const handleClose = () => {
    setSelectedSource(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="text-emerald-500" size={24} />
            Choose Valuation Data Source
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Select which data source you want to use for the property valuation:
          </p>

          {/* Option 1: Homely Data */}
          <div
            onClick={() => setSelectedSource("homely")}
            className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
              selectedSource === "homely"
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                : "border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-700"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedSource === "homely"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}>
                <Database size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                  Homely Comparable Sales
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Use live comparable sales data from Homely.com.au. This includes recent sold properties
                  in the same suburb with similarity scoring based on beds, baths, and land size.
                </p>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Live market data from Historic Property Sales section
                </div>
              </div>
              {selectedSource === "homely" && (
                <div className="text-emerald-500">
                  <CheckCircle2 size={24} />
                </div>
              )}
            </div>
          </div>

          {/* Option 2: RP Data / Additional Reports */}
          <div
            onClick={() => hasReports && hasEstimates && setSelectedSource("reports")}
            className={`p-5 rounded-xl border-2 transition-all ${
              !hasReports || !hasEstimates
                ? "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60"
                : selectedSource === "reports"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer"
                : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedSource === "reports"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}>
                <FileText size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                  RP Data Report & Additional Data
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Use valuation estimates from your uploaded RP Data Report and/or Additional Report.
                  The AI will prioritize these professional valuations over Homely data.
                </p>

                {/* Status indicators */}
                <div className="space-y-1.5">
                  {/* RP Data Status */}
                  <div className={`flex items-center gap-2 text-sm ${
                    hasRpData && rpDataHasEstimates
                      ? "text-emerald-600 dark:text-emerald-400"
                      : hasRpData
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {hasRpData && rpDataHasEstimates ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span className="font-medium">RP Data Report: Contains valuation estimates</span>
                      </>
                    ) : hasRpData ? (
                      <>
                        <AlertCircle size={16} />
                        <span>RP Data Report: No numerical estimates detected</span>
                      </>
                    ) : (
                      <>
                        <X size={16} />
                        <span>RP Data Report: Not uploaded</span>
                      </>
                    )}
                  </div>

                  {/* Additional Report Status */}
                  <div className={`flex items-center gap-2 text-sm ${
                    hasAdditionalReport && additionalReportHasEstimates
                      ? "text-emerald-600 dark:text-emerald-400"
                      : hasAdditionalReport
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {hasAdditionalReport && additionalReportHasEstimates ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span className="font-medium">Additional Report: Contains valuation estimates</span>
                      </>
                    ) : hasAdditionalReport ? (
                      <>
                        <AlertCircle size={16} />
                        <span>Additional Report: No numerical estimates detected</span>
                      </>
                    ) : (
                      <>
                        <X size={16} />
                        <span>Additional Report: Not uploaded</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Warning if no estimates */}
                {hasReports && !hasEstimates && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>
                        No numerical value estimates found in your reports. Please add valuation data
                        to use this option, or select Homely Comparable Sales instead.
                      </span>
                    </p>
                  </div>
                )}
              </div>
              {selectedSource === "reports" && (
                <div className="text-blue-500">
                  <CheckCircle2 size={24} />
                </div>
              )}
            </div>
          </div>

          {/* Option 3: All Data */}
          <div
            onClick={() => hasReports && hasEstimates && setSelectedSource("all")}
            className={`p-5 rounded-xl border-2 transition-all ${
              !hasReports || !hasEstimates
                ? "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60"
                : selectedSource === "all"
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 cursor-pointer"
                : "border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedSource === "all"
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}>
                <Database size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                  All Data Combined
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Use both Homely comparable sales AND RP Data/Additional Reports together.
                  The AI will consider all available data sources to provide a comprehensive valuation.
                </p>
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Combines all available data for best accuracy
                </div>
              </div>
              {selectedSource === "all" && (
                <div className="text-purple-500">
                  <CheckCircle2 size={24} />
                </div>
              )}
            </div>
          </div>

          {/* Note about missing reports */}
          {!hasReports && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-gray-400" />
                <span>
                  To use RP Data or Additional Reports for valuation, go back to the property details
                  page and upload your reports first.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedSource}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedSource === "reports"
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : selectedSource === "all"
                ? "bg-purple-500 hover:bg-purple-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {selectedSource === "reports"
              ? "Evaluate with Reports"
              : selectedSource === "all"
              ? "Evaluate with All Data"
              : "Evaluate with Homely Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
