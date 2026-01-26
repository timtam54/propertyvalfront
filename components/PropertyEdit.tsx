"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  User,
  FileText,
  DollarSign,
  MapPin,
  LayoutTemplate,
  X,
  GripVertical
} from "lucide-react";
import { API } from "@/lib/config";
import ReportUploadModal from "@/components/ReportUploadModal";
import PropertyTemplates from "@/components/PropertyTemplates";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

interface MarketingPackage {
  id: string;
  name: string;
  price: number;
  description?: string;
  inclusions?: Array<{ text: string; price?: number } | string>;
}

interface PropertyData {
  id?: string;
  location: string;
  beds: number;
  baths: number;
  carpark: number;
  price: number | null;
  property_type: string;
  images: string[];
  features?: string;
  size?: number;
  strata_body_corps?: number;
  council_rates?: number;
  agent1_name?: string;
  agent1_phone?: string;
  agent2_name?: string;
  agent2_phone?: string;
  agent_email?: string;
  rp_data_report?: string;
  additional_report?: string;
  neighbouring_suburb?: string;
  neighbouring_postcode?: string;
  neighbouring_state?: string;
}

interface PropertyEditProps {
  property?: PropertyData | null;
  userEmail: string;
  onSave: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function PropertyEdit({ property, userEmail, onSave, onClose, isOpen }: PropertyEditProps) {
  const isEditing = !!property?.id && property.id !== "0";
  const [loading, setLoading] = useState(false);
  const { loaded: googleLoaded } = useGoogleMaps();
  const [formData, setFormData] = useState({
    beds: "",
    baths: "",
    carpark: "",
    location: "",
    price: "",
    size: "",
    property_type: "",
    features: "",
    strata_body_corps: "",
    council_rates: "",
    images: [] as string[],
    agent1_name: "",
    agent1_phone: "",
    agent2_name: "",
    agent2_phone: "",
    agent_email: "",
    neighbouring_suburb: "",
    neighbouring_postcode: "",
    neighbouring_state: "",
  });

  const [marketingPackages, setMarketingPackages] = useState<MarketingPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [showRpDataModal, setShowRpDataModal] = useState(false);
  const [showAdditionalReportModal, setShowAdditionalReportModal] = useState(false);
  const [rpDataText, setRpDataText] = useState("");
  const [additionalReportText, setAdditionalReportText] = useState("");
  const [uploadingRpData, setUploadingRpData] = useState(false);
  const [uploadingAdditionalReport, setUploadingAdditionalReport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const formInitializedRef = useRef(false);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (googleLoaded && locationInputRef.current && !autocompleteRef.current && isOpen) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'au' },
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          setFormData((prev) => ({
            ...prev,
            location: place.formatted_address || "",
          }));
        }
      });

      autocompleteRef.current = autocomplete;
    }
  }, [googleLoaded, isOpen]);

  // Load agent settings and marketing packages
  useEffect(() => {
    if (isOpen) {
      loadAgentSettings();
      loadMarketingPackages();
    }
  }, [isOpen]);

  // Populate form when editing - only initialize once per modal open
  useEffect(() => {
    if (!isOpen) {
      formInitializedRef.current = false;
      return;
    }

    if (formInitializedRef.current) {
      return; // Already initialized for this session
    }

    if (property) {
      setFormData({
        beds: property.beds.toString(),
        baths: property.baths.toString(),
        carpark: property.carpark.toString(),
        location: property.location,
        price: property.price ? property.price.toString() : "",
        size: property.size ? property.size.toString() : "",
        property_type: property.property_type || "",
        features: property.features || "",
        strata_body_corps: property.strata_body_corps ? property.strata_body_corps.toString() : "",
        council_rates: property.council_rates ? property.council_rates.toString() : "",
        images: property.images || [],
        agent1_name: property.agent1_name || "",
        agent1_phone: property.agent1_phone || "",
        agent2_name: property.agent2_name || "",
        agent2_phone: property.agent2_phone || "",
        agent_email: property.agent_email || "",
        neighbouring_suburb: property.neighbouring_suburb || "",
        neighbouring_postcode: property.neighbouring_postcode || "",
        neighbouring_state: property.neighbouring_state || "",
      });
      setRpDataText(property.rp_data_report || "");
      setAdditionalReportText(property.additional_report || "");
      formInitializedRef.current = true;
    } else {
      // Reset form for new property
      setFormData({
        beds: "",
        baths: "",
        carpark: "",
        location: "",
        price: "",
        size: "",
        property_type: "",
        features: "",
        strata_body_corps: "",
        council_rates: "",
        images: [],
        agent1_name: "",
        agent1_phone: "",
        agent2_name: "",
        agent2_phone: "",
        agent_email: "",
        neighbouring_suburb: "",
        neighbouring_postcode: "",
        neighbouring_state: "",
      });
      setRpDataText("");
      setAdditionalReportText("");
      loadAgentSettings();
      formInitializedRef.current = true;
    }
  }, [property, isOpen]);

  // Reset autocomplete when modal closes
  useEffect(() => {
    if (!isOpen) {
      autocompleteRef.current = null;
    }
  }, [isOpen]);

  const loadMarketingPackages = async () => {
    try {
      const response = await fetch(`${API}/marketing-packages`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMarketingPackages(data.packages || []);
        }
      }
    } catch (error) {
      console.error("Error loading marketing packages:", error);
    }
  };

  const loadAgentSettings = async () => {
    try {
      const response = await fetch(`${API}/agent-settings`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.settings) {
          const settings = data.settings;
          setFormData((prev) => ({
            ...prev,
            beds: prev.beds || "",
            baths: prev.baths || "",
            carpark: prev.carpark || "",
            location: prev.location || "",
            price: prev.price || "",
            size: prev.size || "",
            property_type: prev.property_type || "",
            features: prev.features || "",
            strata_body_corps: prev.strata_body_corps || "",
            council_rates: prev.council_rates || "",
            images: prev.images || [],
            agent1_name: settings.agent1_name || "",
            agent1_phone: settings.agent1_phone || "",
            agent2_name: settings.agent2_name || "",
            agent2_phone: settings.agent2_phone || "",
            agent_email: settings.agent_email || "",
            neighbouring_suburb: prev.neighbouring_suburb || "",
            neighbouring_postcode: prev.neighbouring_postcode || "",
            neighbouring_state: prev.neighbouring_state || "",
          }));
        }
      }
    } catch (error) {
      console.error("Error loading agent settings:", error);
    }
  };

  const saveAgentSettings = async () => {
    try {
      const settings = {
        agent1_name: formData.agent1_name,
        agent1_phone: formData.agent1_phone,
        agent2_name: formData.agent2_name,
        agent2_phone: formData.agent2_phone,
        agent_email: formData.agent_email,
      };
      const response = await fetch(`${API}/agent-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to save');
      toast.success("Agent contact details saved!");
    } catch (error) {
      console.error("Error saving agent settings:", error);
      toast.error("Failed to save agent settings");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

    if (files.length === 0) return;

    const totalImages = formData.images.length + files.length;
    if (totalImages > 25) {
      toast.error("Maximum 25 images allowed");
      return;
    }

    const loadingToast = toast.loading(`Uploading ${files.length} image(s)...`);

    try {
      const formDataUpload = new FormData();
      files.forEach((file) => formDataUpload.append('files', file));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        const status = response.status;

        let errorMessage = '';
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || 'Upload failed';
        } else {
          const errorText = await response.text();
          errorMessage = errorText || '';
        }

        if (status === 403 || errorMessage.toLowerCase().includes('forbidden')) {
          throw new Error(`Upload blocked (Error 403). Try: 1) Disable VPN/ad-blockers 2) Try a different network`);
        } else if (status === 413) {
          throw new Error('File too large. Please use smaller images (max 4.5MB each).');
        } else {
          throw new Error(`Upload failed (${status}): ${errorMessage.slice(0, 100)}`);
        }
      }

      const data = await response.json();
      toast.dismiss(loadingToast);
      toast.success(`${files.length} image(s) uploaded`);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...data.urls],
      }));
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error uploading images:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    }
  };

  const removeImage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setFormData((prev) => {
      const newImages = [...prev.images];
      const [draggedImage] = newImages.splice(draggedIndex, 1);
      newImages.splice(dropIndex, 0, draggedImage);
      return { ...prev, images: newImages };
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.beds || !formData.baths || !formData.carpark || !formData.location || !formData.property_type) {
      toast.error("Please fill in all required fields");
      return;
    }

    const estimatedSize = (rpDataText?.length || 0) + (additionalReportText?.length || 0);
    const maxSize = 4 * 1024 * 1024;

    if (estimatedSize > maxSize) {
      const sizeMB = (estimatedSize / (1024 * 1024)).toFixed(1);
      toast.error(`Total data size (${sizeMB}MB) exceeds maximum upload limit of 4MB.`);
      return;
    }

    setLoading(true);
    try {
      const selectedPackageData = marketingPackages.find(pkg => pkg.id === selectedPackage);

      const payload = {
        beds: parseInt(formData.beds),
        baths: parseInt(formData.baths),
        carpark: parseInt(formData.carpark),
        location: formData.location,
        price: formData.price ? parseFloat(formData.price) : null,
        size: formData.size ? parseFloat(formData.size) : null,
        property_type: formData.property_type || null,
        features: formData.features || null,
        strata_body_corps: formData.strata_body_corps ? parseFloat(formData.strata_body_corps) : null,
        council_rates: formData.council_rates ? parseFloat(formData.council_rates) : null,
        marketing_package: selectedPackage || null,
        marketing_cost: selectedPackageData ? selectedPackageData.price : null,
        images: formData.images,
        agent1_name: formData.agent1_name || null,
        agent1_phone: formData.agent1_phone || null,
        agent2_name: formData.agent2_name || null,
        agent2_phone: formData.agent2_phone || null,
        agent_email: formData.agent_email || null,
        rp_data_report: rpDataText || null,
        additional_report: additionalReportText || null,
        user_email: userEmail || null,
        neighbouring_suburb: formData.neighbouring_suburb || null,
        neighbouring_postcode: formData.neighbouring_postcode || null,
        neighbouring_state: formData.neighbouring_state || null,
      };

      const url = isEditing ? `${API}/properties/${property!.id}` : `${API}/properties`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      toast.success(property?.id ? "Property updated successfully!" : "Property added successfully!");
      onSave();
    } catch (error: any) {
      console.error("Error saving property:", error);
      const errorMessage = error.message || "Failed to save property";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    const response = await fetch(`${API}/properties/extract-pdf-text`, {
      method: 'POST',
      body: formDataUpload,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.detail || 'Failed to extract text from PDF';
      throw new Error(errorMsg);
    }

    const data = await response.json();
    if (!data.success || !data.text) {
      throw new Error('No text could be extracted from this PDF. It may be a scanned document. Please use "Paste Text" instead.');
    }

    return data.text;
  };

  const handleRpDataSave = async (data: { type: "pdf" | "text"; file?: File; text?: string }) => {
    setUploadingRpData(true);
    try {
      if (data.type === "pdf" && data.file) {
        const extractedText = await extractTextFromPdf(data.file);
        setRpDataText(extractedText);
        toast.success("PDF text extracted successfully!");
      } else if (data.type === "text" && data.text) {
        setRpDataText(data.text);
        toast.success("RP Data saved!");
      }
      setShowRpDataModal(false);
    } catch (error: any) {
      console.error("Error extracting PDF text:", error);
      toast.error("Failed to extract text from PDF. Please try pasting the text instead.");
    } finally {
      setUploadingRpData(false);
    }
  };

  const handleAdditionalReportSave = async (data: { type: "pdf" | "text"; file?: File; text?: string }) => {
    setUploadingAdditionalReport(true);
    try {
      if (data.type === "pdf" && data.file) {
        const extractedText = await extractTextFromPdf(data.file);
        setAdditionalReportText(extractedText);
        toast.success("PDF text extracted successfully!");
      } else if (data.type === "text" && data.text) {
        setAdditionalReportText(data.text);
        toast.success("Additional Report saved!");
      }
      setShowAdditionalReportModal(false);
    } catch (error: any) {
      console.error("Error extracting PDF text:", error);
      toast.error("Failed to extract text from PDF. Please try pasting the text instead.");
    } finally {
      setUploadingAdditionalReport(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setFormData(prev => ({
      ...prev,
      beds: template.beds.toString(),
      baths: template.baths.toString(),
      carpark: template.carpark.toString(),
      property_type: template.property_type,
      features: template.features || '',
      agent1_name: template.default_agent1_name || prev.agent1_name,
      agent1_phone: template.default_agent1_phone || prev.agent1_phone,
    }));
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied!`);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    color: '#111827',
    fontSize: '14px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '4px',
  };

  const inputClass = "w-full bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all";
  const labelClass = "block text-sm font-semibold text-gray-700";

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-4 sm:py-8">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-3 sm:p-4 lg:p-6 border-b border-cyan-700 gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-t-xl">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                {isEditing ? "Edit Property" : "Add Property"}
              </h2>
             
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-all text-xs sm:text-sm"
                >
                  <LayoutTemplate className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Template</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-3 sm:p-4 lg:p-6 max-h-[calc(100vh-180px)] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              {/* Property Details Grid - 2 cols mobile, 4 cols tablet+ */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                <div>
                  <label style={labelStyle}>Bedrooms *</label>
                  <input
                    type="number"
                    name="beds"
                    value={formData.beds}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="e.g., 4"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label style={labelStyle}>Bathrooms *</label>
                  <input
                    type="number"
                    name="baths"
                    value={formData.baths}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="e.g., 2"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label style={labelStyle}>Car Parks *</label>
                  <input
                    type="number"
                    name="carpark"
                    value={formData.carpark}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="e.g., 2"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label style={labelStyle}>Price ($)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="e.g., 850000"
                    min="0"
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    {['Apartment', 'Unit', 'Townhouse'].includes(formData.property_type)
                      ? 'Floor Area (sqm)'
                      : 'Land Area (sqm)'}
                  </label>
                  <input
                    type="number"
                    name="size"
                    value={formData.size}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder={['Apartment', 'Unit', 'Townhouse'].includes(formData.property_type)
                      ? "e.g., 85"
                      : "e.g., 600"}
                    min="0"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Property Type *</label>
                  <select
                    name="property_type"
                    value={formData.property_type}
                    onChange={handleInputChange}
                    style={inputStyle}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Unit">Unit</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Villa">Villa</option>
                    <option value="Land">Land</option>
                    <option value="Acreage">Acreage</option>
                    <option value="Rural Property">Rural Property</option>
                    <option value="Block of Units">Block of Units</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Strata/Body Corps ($)</label>
                  <input
                    type="number"
                    name="strata_body_corps"
                    value={formData.strata_body_corps}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="e.g., 1200"
                    min="0"
                  />
                </div>

                <div>
                  <label style={labelStyle}>Council Rates ($)</label>
                  <input
                    type="number"
                    name="council_rates"
                    value={formData.council_rates}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="e.g., 2500"
                    min="0"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="mb-6 relative">
                <label className={labelClass}>Location *</label>
                <input
                  ref={locationInputRef}
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  style={inputStyle}
                  placeholder="Start typing an address..."
                  required
                  autoComplete="off"
                />
                {!googleLoaded && (
                  <p className="text-xs text-gray-400 mt-1">Loading address suggestions...</p>
                )}
              </div>

              {/* Neighbouring Suburb */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">Neighbouring Suburb (Optional)</h4>
                </div>
                <p className="text-xs text-blue-600 mb-3">
                  Add a nearby suburb to include additional comparable sales in the historic property sales analysis.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Suburb</label>
                    <input
                      type="text"
                      name="neighbouring_suburb"
                      value={formData.neighbouring_suburb}
                      onChange={handleInputChange}
                      style={inputStyle}
                      placeholder="e.g., North Ward"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Postcode</label>
                    <input
                      type="text"
                      name="neighbouring_postcode"
                      value={formData.neighbouring_postcode}
                      onChange={handleInputChange}
                      style={inputStyle}
                      placeholder="e.g., 4810"
                      maxLength={4}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-blue-700 mb-1">State</label>
                    <select
                      name="neighbouring_state"
                      value={formData.neighbouring_state}
                      onChange={handleInputChange}
                      style={inputStyle}
                    >
                      <option value="">Select state</option>
                      <option value="QLD">QLD</option>
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="SA">SA</option>
                      <option value="WA">WA</option>
                      <option value="TAS">TAS</option>
                      <option value="NT">NT</option>
                      <option value="ACT">ACT</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Features */}
              <div className="mb-6">
                <label className={labelClass}>Additional Features</label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  className={`${inputClass} min-h-[100px] resize-y px-4 py-3`}
                  placeholder="e.g., Swimming pool, garden, modern kitchen, solar panels..."
                />
              </div>

              {/* Agent Contact Section */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">Agent Contact</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 sm:line-clamp-1">
                      Save details to auto-fill for future properties
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={saveAgentSettings}
                    className="inline-flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm flex-shrink-0"
                  >
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Agent 1 */}
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-cyan-200">
                    <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />
                      <h4 className="font-semibold text-cyan-700 text-xs sm:text-sm">Agent 1</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                        <input
                          type="text"
                          name="agent1_name"
                          value={formData.agent1_name}
                          onChange={handleInputChange}
                          className={`${inputClass} px-2 sm:px-3 py-1.5 sm:py-2 text-sm`}
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                        <input
                          type="tel"
                          name="agent1_phone"
                          value={formData.agent1_phone}
                          onChange={handleInputChange}
                          className={`${inputClass} px-2 sm:px-3 py-1.5 sm:py-2 text-sm`}
                          placeholder="0412 345 678"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Agent 2 */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-emerald-200">
                    <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      <h4 className="font-semibold text-emerald-700 text-xs sm:text-sm">Agent 2</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                        <input
                          type="text"
                          name="agent2_name"
                          value={formData.agent2_name}
                          onChange={handleInputChange}
                          className={`${inputClass} px-2 sm:px-3 py-1.5 sm:py-2 text-sm`}
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                        <input
                          type="tel"
                          name="agent2_phone"
                          value={formData.agent2_phone}
                          onChange={handleInputChange}
                          className={`${inputClass} px-2 sm:px-3 py-1.5 sm:py-2 text-sm`}
                          placeholder="0412 987 654"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-6">
                <label className={labelClass}>Property Images (up to 25)</label>
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 transition-all cursor-pointer"
                />

                {formData.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <GripVertical className="w-3 h-3" />
                      Drag images to reorder. First image is the cover photo.
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {formData.images.map((img, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`relative group cursor-grab active:cursor-grabbing ${
                            draggedIndex === index ? 'opacity-50 scale-95' : ''
                          } ${
                            dragOverIndex === index ? 'ring-2 ring-cyan-500 ring-offset-2' : ''
                          } transition-all duration-150`}
                        >
                          {index === 0 && (
                            <span className="absolute top-0 left-0 bg-cyan-500 text-white text-[10px] font-bold px-1 rounded-br-md z-10">
                              Cover
                            </span>
                          )}
                          <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
                          </div>
                          <img
                            src={img}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-16 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RP Data Report Section */}
              <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <FileText size={16} />
                    RP Data Report
                  </h3>
                  {!rpDataText ? (
                    <button
                      type="button"
                      onClick={() => setShowRpDataModal(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <DollarSign size={14} />
                      Add RP Data
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRpDataText('')}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="bg-white p-3 rounded-lg">
                  {!rpDataText ? (
                    <p className="text-amber-700 text-sm">
                      Have personal access to RP Data? Add the report here to enhance your property evaluation.
                    </p>
                  ) : (
                    <div className="text-gray-800 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {rpDataText.slice(0, 500)}...
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Report Section */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                    <FileText size={16} />
                    Additional Report
                  </h3>
                  {!additionalReportText ? (
                    <button
                      type="button"
                      onClick={() => setShowAdditionalReportModal(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <DollarSign size={14} />
                      Add Report
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdditionalReportText('')}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="bg-white p-3 rounded-lg">
                  {!additionalReportText ? (
                    <p className="text-blue-700 text-sm">
                      Upload any additional property reports, valuations, or documents to enhance your analysis.
                    </p>
                  ) : (
                    <div className="text-gray-800 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {additionalReportText.slice(0, 500)}...
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold text-sm sm:text-base rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : (isEditing ? "Save Changes" : "Save Property")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm sm:text-base rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* RP Data Modal */}
      <ReportUploadModal
        isOpen={showRpDataModal}
        onClose={() => setShowRpDataModal(false)}
        onUpload={handleRpDataSave}
        title="Add RP Data Report"
        description="Upload your RP Data report as a PDF file."
        textPlaceholder="Paste your RP Data report here..."
        accentColor="amber"
        isUploading={uploadingRpData}
      />

      {/* Additional Report Modal */}
      <ReportUploadModal
        isOpen={showAdditionalReportModal}
        onClose={() => setShowAdditionalReportModal(false)}
        onUpload={handleAdditionalReportSave}
        title="Add Additional Report"
        description="Upload your report as a PDF file."
        textPlaceholder="Paste your report content here..."
        accentColor="blue"
        isUploading={uploadingAdditionalReport}
      />

      {/* Property Templates Modal */}
      {showTemplates && (
        <PropertyTemplates
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
          userEmail={userEmail}
        />
      )}
    </>
  );
}
