"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Home, Loader2, TrendingUp, AlertCircle, DollarSign, Sparkles, CheckCircle } from "lucide-react";
import { API } from "@/lib/config";
import { usePageView } from "@/hooks/useAudit";

// Window interface for Google Places already declared in app/page.tsx

type EvaluationStage = 'idle' | 'queued' | 'fetching_data' | 'generating_evaluation' | 'completed' | 'failed';

interface EvaluationResult {
  evaluation_report: string;
  comparables_data?: {
    statistics?: {
      total_found?: number;
      median_price?: number;
      avg_price?: number;
      price_range?: {
        min?: number;
        max?: number;
        avg?: number;
        median?: number;
      };
    };
    comparable_sold?: Array<{
      address: string;
      price: number;
      beds: number;
      baths: number;
      cars: number;
      sold_date: string;
    }>;
    comparable_listings?: Array<{
      address: string;
      price: number;
      beds: number;
      baths: number;
      cars: number;
      listing_type: string;
    }>;
  };
  price_per_sqm?: number;
  improvements?: string;
}

export default function QuickEvaluationPage() {
  const router = useRouter();

  // Track page view for audit
  usePageView('quick-evaluation');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<EvaluationStage>('idle');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    location: "",
    beds: "",
    baths: "",
    carpark: "",
    property_type: "",
    size: "",
    price: "",
    features: "",
  });

  // Load Google Places API
  useEffect(() => {
    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_API_KEY) {
      console.warn('Google API key not configured');
      return;
    }

    if (window.google?.maps?.places) {
      setGoogleLoaded(true);
      return;
    }

    // Check if a Google Maps script is already loading
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Script exists, poll for it to be ready
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval);
          setGoogleLoaded(true);
        }
      }, 100);
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (window.google?.maps?.places) {
          setGoogleLoaded(true);
        }
      }, 10000);
      return;
    }

    // Create callback function
    window.initGooglePlaces = () => {
      setGoogleLoaded(true);
    };

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup
      window.initGooglePlaces = undefined as unknown as () => void;
    };
  }, []);

  // Initialize autocomplete when Google is loaded and input is available
  useEffect(() => {
    if (!googleLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'au' },
        fields: ['formatted_address', 'address_components', 'geometry']
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
          const address = place.formatted_address;
          setFormData(prev => ({
            ...prev,
            location: address
          }));
        }
      });
    } catch (err) {
      console.error('Error initializing Google Places:', err);
    }
  }, [googleLoaded]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (uploadedImages.length + files.length > 10) {
      toast.error("Maximum 10 images allowed for quick evaluation");
      return;
    }

    const loadingToast = toast.loading(`Uploading ${files.length} image${files.length > 1 ? 's' : ''}...`);

    try {
      // Upload to Azure Blob Storage
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { urls } = await response.json();

      toast.dismiss(loadingToast);
      setUploadedImages([...uploadedImages, ...urls]);
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`);

    } catch (error) {
      console.error('Error uploading images:', error);
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : 'Failed to upload images. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const pollForResult = async (jobId: string) => {
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${API}/evaluate-quick/${jobId}/status`);
        const { status, stage: currentStage, result: jobResult, error: jobError } = response.data;

        setStage(currentStage);

        if (status === 'completed' && jobResult) {
          setResult(jobResult);
          setLoading(false);
          toast.success("Evaluation complete!");
          return;
        }

        if (status === 'failed') {
          setError(jobError || 'Evaluation failed');
          setLoading(false);
          toast.error(jobError || 'Evaluation failed');
          return;
        }

        // Wait 1.5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 1500));
        attempts++;
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Evaluation job expired or not found');
          setLoading(false);
          return;
        }
        // Continue polling on other errors
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    setError('Evaluation timed out');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.location || !formData.beds || !formData.baths || !formData.carpark) {
      toast.error("Please fill in location, bedrooms, bathrooms, and car parks");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStage('queued');

    try {
      const payload = {
        location: formData.location,
        beds: parseInt(formData.beds) || 0,
        baths: parseInt(formData.baths) || 0,
        carpark: parseInt(formData.carpark) || 0,
        size: formData.size ? parseFloat(formData.size) : null,
        property_type: formData.property_type || "Property",
        price: formData.price ? parseFloat(formData.price) : null,
        features: formData.features || null,
        images: uploadedImages
      };

      const response = await axios.post(`${API}/evaluate-quick`, payload);

      if (response.data.success && response.data.job_id) {
        toast.info("Evaluation started...");
        await pollForResult(response.data.job_id);
      } else {
        throw new Error('Failed to start evaluation');
      }
    } catch (err: any) {
      console.error("Error starting evaluation:", err);
      const message = err.response?.data?.detail || "Failed to start evaluation. Make sure the backend is running and API keys are configured.";
      setError(message);
      toast.error(message);
      setLoading(false);
      setStage('failed');
    }
  };

  const handleSaveProperty = async () => {
    if (!result) {
      toast.error("Please complete evaluation first");
      return;
    }

    setSaving(true);
    try {
      const propertyData = {
        beds: parseInt(formData.beds),
        baths: parseInt(formData.baths),
        carpark: parseInt(formData.carpark),
        location: formData.location,
        price: formData.price ? parseFloat(formData.price) : null,
        size: formData.size ? parseFloat(formData.size) : null,
        property_type: formData.property_type || "Property",
        features: formData.features || null,
        images: uploadedImages,
        evaluation_report: result.evaluation_report,
        comparables_data: result.comparables_data,
        price_per_sqm: result.price_per_sqm
      };

      const response = await axios.post(`${API}/properties`, propertyData);

      if (response.data && response.data.id) {
        toast.success("Property saved successfully!");
        router.push(`/property/${response.data.id}`);
      }
    } catch (error: any) {
      console.error("Error saving property:", error);
      toast.error(`Failed to save property: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getStageText = (stage: EvaluationStage) => {
    switch (stage) {
      case 'queued': return 'Starting evaluation...';
      case 'fetching_data': return 'Analyzing market data...';
      case 'generating_evaluation': return 'Generating report...';
      case 'completed': return 'Evaluation complete!';
      case 'failed': return 'Evaluation failed';
      default: return '';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)' }}>
      {/* Header */}
      <header style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(148,163,184,0.1)', padding: '0.75rem 0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Home className="text-cyan-500" size={28} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PropertyPitch</h1>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'white',
            border: '1px solid #e2e8f0',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>

        {!result ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <DollarSign size={32} className="text-emerald-500" />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Quick Property Evaluation</h2>
            </div>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Get an instant AI-powered property valuation using CoreLogic methodology, current market data, and interest rate analysis
            </p>

            {/* What You'll Get Box */}
            <div style={{
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              padding: '1.25rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              border: '2px solid #93c5fd'
            }}>
              <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                <TrendingUp size={18} />
                What You'll Get:
              </h4>
              <ul style={{ color: '#1e40af', fontSize: '0.9rem', lineHeight: '1.8', marginLeft: '1.25rem', margin: 0, paddingLeft: '1.25rem' }}>
                <li>Estimated property value range (Conservative/Market/Premium)</li>
                <li>Comparable sales analysis for your area</li>
                <li>Current interest rate impact (RBA 3.60%)</li>
                <li>Market positioning and pricing recommendations</li>
                <li>Investment analysis and growth forecasts</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit}>
              {/* First Row: Location, Property Type, Bedrooms, Bathrooms */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Property Location *</label>
                  <input
                    ref={inputRef}
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Start typing an address..."
                    required
                    disabled={loading}
                    autoComplete="off"
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Property Type</label>
                  <select
                    name="property_type"
                    value={formData.property_type}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', background: 'white' }}
                  >
                    <option value="">Select type</option>
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Unit">Unit</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Bedrooms *</label>
                  <input
                    type="number"
                    name="beds"
                    value={formData.beds}
                    onChange={handleChange}
                    placeholder="e.g., 3"
                    required
                    min="0"
                    disabled={loading}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Bathrooms *</label>
                  <input
                    type="number"
                    name="baths"
                    value={formData.baths}
                    onChange={handleChange}
                    placeholder="e.g., 2"
                    required
                    min="0"
                    disabled={loading}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              {/* Second Row: Car Parks, Size, Price */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Car Parks *</label>
                  <input
                    type="number"
                    name="carpark"
                    value={formData.carpark}
                    onChange={handleChange}
                    placeholder="e.g., 2"
                    required
                    min="0"
                    disabled={loading}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Land/Floor Size (sqm)</label>
                  <input
                    type="number"
                    name="size"
                    value={formData.size}
                    onChange={handleChange}
                    placeholder="e.g., 200"
                    min="0"
                    disabled={loading}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Current/Asking Price (Optional)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g., 850000"
                    min="0"
                    disabled={loading}
                    style={{ width: '100%', padding: '0.65rem 0.875rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem' }}
                  />
                </div>
              </div>

              {/* Features Textarea */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Additional Features (Optional)</label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleChange}
                  placeholder="e.g., Recently renovated, pool, ocean views..."
                  disabled={loading}
                  style={{ width: '100%', padding: '0.65rem 0.875rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.95rem', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              {/* Image Upload Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', color: '#334155', fontSize: '0.9rem' }}>Property Photos (Optional - up to 10)</label>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  Upload photos for more accurate valuation with condition assessment, or we'll search for images online based on the address
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={loading}
                  style={{ width: '100%', padding: '0.5rem', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />

                {uploadedImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {uploadedImages.map((img, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <img src={img} alt={`Property ${index + 1}`} style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Note Box */}
              <div style={{
                background: '#fef3c7',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: '2px solid #fbbf24',
                marginBottom: '1.5rem'
              }}>
                <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>
                  💡 <strong>Note:</strong> This evaluation is based on property specifications and market data.
                  For a more detailed valuation including photo analysis and condition assessment, create a full property listing with images.
                </p>
              </div>

              {loading && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                  padding: "1rem",
                  background: "#f0f9ff",
                  borderRadius: "12px"
                }}>
                  <Loader2 className="animate-spin text-sky-500" size={24} />
                  <span style={{ color: "#0369a1", fontWeight: "500" }}>
                    {getStageText(stage)}
                  </span>
                </div>
              )}

              {error && (
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                  padding: "1rem",
                  background: "#fef2f2",
                  borderRadius: "12px",
                  border: "1px solid #fecaca"
                }}>
                  <AlertCircle className="text-red-500" size={24} style={{ flexShrink: 0 }} />
                  <span style={{ color: "#b91c1c" }}>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                <Sparkles size={20} />
                {loading ? "Evaluating Property... (20-30s)" : "Get Property Valuation"}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            {/* Evaluation Complete Header */}
            <div style={{
              marginBottom: '1.5rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
              borderRadius: '12px'
            }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={28} />
                Evaluation Complete!
              </h1>
              <h2 style={{ fontSize: '1.1rem', color: '#047857', marginBottom: '0.75rem' }}>{formData.location}</h2>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.95rem', color: '#047857' }}>
                <div><strong>{formData.beds}</strong> Bedrooms</div>
                <div><strong>{formData.baths}</strong> Bathrooms</div>
                <div><strong>{formData.carpark}</strong> Car Parks</div>
                {formData.size && <div><strong>{formData.size}</strong> sqm</div>}
              </div>
            </div>

            {/* Condition Note */}
            {result.improvements && (
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '2px solid #fbbf24',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} />
                  Evaluation Basis
                </h4>
                <div style={{ color: '#78350f', fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {result.improvements}
                </div>
              </div>
            )}

            {/* Comparables Data */}
            {result.comparables_data && result.comparables_data.statistics && result.comparables_data.statistics.total_found && result.comparables_data.statistics.total_found > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '2px solid #bae6fd',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={22} />
                  Market Comparables Data
                </h3>

                {/* Price Per Sqm */}
                {result.price_per_sqm && (
                  <div style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                    border: '2px solid #93c5fd'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.35rem' }}>
                      Price Per Square Meter
                    </h4>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669', margin: 0 }}>
                      ${result.price_per_sqm.toLocaleString()} / sqm
                    </p>
                    {formData.size && (
                      <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                        Based on {formData.size} sqm property size
                      </p>
                    )}
                  </div>
                )}

                {/* Statistics */}
                {result.comparables_data.statistics.price_range && (
                  <div style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                    border: '2px solid #93c5fd'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.75rem' }}>
                      Market Statistics ({result.comparables_data.statistics.total_found} comparable properties)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.15rem' }}>Price Range</p>
                        <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                          ${result.comparables_data.statistics.price_range.min?.toLocaleString() || 0} - ${result.comparables_data.statistics.price_range.max?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.15rem' }}>Average Price</p>
                        <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                          ${result.comparables_data.statistics.price_range.avg?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.15rem' }}>Median Price</p>
                        <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af', margin: 0 }}>
                          ${result.comparables_data.statistics.price_range.median?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recently Sold */}
                {result.comparables_data.comparable_sold && result.comparables_data.comparable_sold.length > 0 && (
                  <div style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                    border: '2px solid #93c5fd'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.75rem' }}>
                      Recently Sold (Domain.com.au)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {result.comparables_data.comparable_sold.slice(0, 5).map((comp, idx) => (
                        <div key={idx} style={{
                          padding: '0.75rem',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          borderLeft: '3px solid #10b981'
                        }}>
                          <p style={{ fontWeight: '600', color: '#0f172a', marginBottom: '0.15rem', fontSize: '0.9rem' }}>
                            {comp.address}
                          </p>
                          <p style={{ color: '#059669', fontWeight: '700', fontSize: '1rem', marginBottom: '0.15rem' }}>
                            ${comp.price.toLocaleString()}
                          </p>
                          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {comp.beds} bed • {comp.baths} bath • {comp.cars} car • Sold: {comp.sold_date}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Listings */}
                {result.comparables_data.comparable_listings && result.comparables_data.comparable_listings.length > 0 && (
                  <div style={{
                    background: 'white',
                    padding: '1rem',
                    borderRadius: '10px',
                    border: '2px solid #93c5fd'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.75rem' }}>
                      Current Listings (Realestate.com.au)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {result.comparables_data.comparable_listings.slice(0, 5).map((comp, idx) => (
                        <div key={idx} style={{
                          padding: '0.75rem',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          borderLeft: '3px solid #0ea5e9'
                        }}>
                          <p style={{ fontWeight: '600', color: '#0f172a', marginBottom: '0.15rem', fontSize: '0.9rem' }}>
                            {comp.address}
                          </p>
                          <p style={{ color: '#0ea5e9', fontWeight: '700', fontSize: '1rem', marginBottom: '0.15rem' }}>
                            ${comp.price.toLocaleString()}
                          </p>
                          <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {comp.beds} bed • {comp.baths} bath • {comp.cars} car • {comp.listing_type}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Valuation Report */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '2px solid #bbf7d0',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={22} />
                Property Valuation Report
              </h3>
              <div style={{ color: '#14532d', fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                {result.evaluation_report}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setResult(null);
                  setStage('idle');
                  setError(null);
                  setFormData({
                    location: "",
                    beds: "",
                    baths: "",
                    carpark: "",
                    property_type: "",
                    size: "",
                    price: "",
                    features: "",
                  });
                  setUploadedImages([]);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                New Evaluation
              </button>

              <button
                onClick={handleSaveProperty}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                <Home size={18} />
                {saving ? 'Saving...' : 'Save as Property'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
