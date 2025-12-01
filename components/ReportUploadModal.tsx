"use client";

import { useState } from "react";
import { X, FileText, Edit, Upload } from "lucide-react";

interface ReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: { type: "pdf" | "text"; file?: File; text?: string }) => Promise<void>;
  title: string;
  description: string;
  textPlaceholder: string;
  accentColor: "amber" | "blue";
  isUploading: boolean;
}

export default function ReportUploadModal({
  isOpen,
  onClose,
  onUpload,
  title,
  description,
  textPlaceholder,
  accentColor,
  isUploading,
}: ReportUploadModalProps) {
  const [uploadMethod, setUploadMethod] = useState<"pdf" | "text">("pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");

  if (!isOpen) return null;

  const colorClasses = {
    amber: {
      activeButton: "bg-amber-500 text-white",
      uploadButton: "bg-amber-500 hover:bg-amber-600",
      focusBorder: "focus:border-amber-500",
    },
    blue: {
      activeButton: "bg-blue-500 text-white",
      uploadButton: "bg-blue-500 hover:bg-blue-600",
      focusBorder: "focus:border-blue-500",
    },
  };

  const colors = colorClasses[accentColor];

  const handleSubmit = async () => {
    if (uploadMethod === "pdf") {
      if (!selectedFile) return;
      await onUpload({ type: "pdf", file: selectedFile });
    } else {
      if (!textInput.trim()) return;
      await onUpload({ type: "text", text: textInput });
    }
    // Reset state after successful upload
    setSelectedFile(null);
    setTextInput("");
    setUploadMethod("pdf");
  };

  const handleClose = () => {
    setSelectedFile(null);
    setTextInput("");
    setUploadMethod("pdf");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setUploadMethod("pdf")}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
              uploadMethod === "pdf" ? colors.activeButton : "bg-gray-100 text-gray-600"
            }`}
          >
            <FileText size={18} />
            Upload PDF
          </button>
          <button
            onClick={() => setUploadMethod("text")}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
              uploadMethod === "text" ? colors.activeButton : "bg-gray-100 text-gray-600"
            }`}
          >
            <Edit size={18} />
            Paste Text
          </button>
        </div>

        {uploadMethod === "pdf" ? (
          <div className="mb-4">
            <p className="text-gray-500 text-sm mb-3">{description} Text will be automatically extracted.</p>
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <FileText size={32} className="text-gray-400 mb-3" />
              <p className="font-semibold text-gray-700">Click to browse or drag & drop</p>
              <p className="text-gray-400 text-sm">PDF files only (max 10MB)</p>
            </label>
            {selectedFile && (
              <p className="mt-3 text-emerald-600 font-medium">Selected: {selectedFile.name}</p>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-gray-500 text-sm mb-3">Paste the text content from your report below.</p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={textPlaceholder}
              className={`w-full min-h-[200px] p-4 border-2 border-gray-200 rounded-xl resize-y ${colors.focusBorder} focus:outline-none`}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || (uploadMethod === "pdf" ? !selectedFile : !textInput.trim())}
            className={`flex-1 flex items-center justify-center gap-2 py-3 ${colors.uploadButton} text-white rounded-lg font-semibold transition-colors disabled:opacity-50`}
          >
            <Upload size={16} />
            {isUploading ? "Processing..." : uploadMethod === "pdf" ? "Upload PDF" : "Save Text"}
          </button>
        </div>
      </div>
    </div>
  );
}
