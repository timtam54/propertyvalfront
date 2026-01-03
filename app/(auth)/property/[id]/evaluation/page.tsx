'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateEvaluationPDF } from '@/utils/pdfGenerator';
import { API } from '@/lib/config';
import { usePageView } from '@/hooks/useAudit';
import ValuationQuality from '@/components/ValuationQuality';
import HistoricSalesCard from '@/components/HistoricSalesCard';
import DarkModeToggle from '@/components/DarkModeToggle';
import EvaluationSourceModal from '@/components/EvaluationSourceModal';
import { useMsalSafe, useGoogleAuth } from '@/components/AuthProvider';
import type {
  ValuationHistoryEntry,
  ConfidenceScoring,
  SuburbMarketTrends,
  ComparableProperty
} from '@/lib/types';
import { Bath, Bed, Car, MapPin, Ruler, ArrowLeft, Edit, Trash2, DollarSign, Home, Menu, ChevronLeft, ChevronRight, Upload, Sparkles, Share2, X, Save, Copy, Check } from 'lucide-react';
import PropertyEdit from '@/components/PropertyEdit';
import ReportUploadModal from '@/components/ReportUploadModal';
import axios from 'axios';
import { toast } from 'sonner';

// Facebook icon component
const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

interface Property {
  id: string;
  location: string;
  beds: number;
  baths: number;
  carpark: number;
  size?: number | null;
  price?: number | null;
  features?: string | null;
  images: string[];
  evaluation_report?: string | null;
  evaluation_date?: string | null;
  improvements_detected?: string | null;
  evaluation_ad?: string | null;
  pricing_type?: string | null;
  price_upper?: number | null;
  marketing_strategy?: string | null;
  property_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rp_data_report?: string | null;
  additional_report?: string | null;
  pitch?: string | null;
  // Estimated value range from valuation
  estimated_value_range?: string | null;
  // Status fields
  status?: 'active' | 'sold' | null;
  sold_price?: number | null;
  // New valuation quality fields
  valuation_history?: ValuationHistoryEntry[];
  confidence_scoring?: ConfidenceScoring | null;
  suburb_trends?: SuburbMarketTrends | null;
  comparables_data?: {
    comparable_sold: ComparableProperty[];
    best_match?: {
      id: string;
      address: string;
      price: number;
      beds: number | null;
      baths: number | null;
      carpark: number | null;
      land_area: number | null;
      property_type: string;
      sold_date: string;
      similarity_score: number;
      is_exact_match: boolean;
    } | null;
    exact_matches_count?: number;
    valuation_basis?: string;
    statistics: {
      total_found: number;
      sold_count: number;
      price_range: {
        min: number | null;
        max: number | null;
        avg: number | null;
        median: number | null;
      };
      exact_match_avg?: number | null;
    };
    data_source?: string;
    domain_api_error?: string | null;
    domain_api_key_used?: string | null;
  } | null;
  selected_comparables?: string[];
}

interface PricingOption {
  type: string;
  label: string;
  displayPrice: string;
  price: number | null;
  priceUpper?: number | null;
  description: string;
}

export default function PropertyEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  // Track page view for audit with property ID
  usePageView('property-evaluation', propertyId ? parseInt(propertyId, 10) || 0 : 0);

  // Auth hooks for user info
  const { accounts } = useMsalSafe();
  const { googleUser } = useGoogleAuth();
  const msalUser = accounts[0];
  const userName = googleUser?.name || msalUser?.name || googleUser?.email || msalUser?.username || '';
  const userEmail = googleUser?.email || msalUser?.username || '';
  const userAvatar = googleUser?.picture || null;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [generatingAd, setGeneratingAd] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReport, setEditedReport] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Marketing Strategy Modal state
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
  const [marketingStrategyText, setMarketingStrategyText] = useState('');

  // Evaluation Source Modal state
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [evaluationSource, setEvaluationSource] = useState<'homely' | 'reports' | null>(null);

  // Header functionality state
  const [deleting, setDeleting] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPropertyEdit, setShowPropertyEdit] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [markingSold, setMarkingSold] = useState(false);

  // Image gallery state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // RP Data and Additional Report modal states
  const [showRpDataModal, setShowRpDataModal] = useState(false);
  const [uploadingRpData, setUploadingRpData] = useState(false);
  const [showAdditionalReportModal, setShowAdditionalReportModal] = useState(false);
  const [uploadingAdditionalReport, setUploadingAdditionalReport] = useState(false);

  // Pitch copy state
  const [pitchCopied, setPitchCopied] = useState(false);

  // Facebook modal states
  const [showFbAdModal, setShowFbAdModal] = useState(false);
  const [showFbPostModal, setShowFbPostModal] = useState(false);

  /**
   * Check if text contains numerical value estimates (prices/valuations)
   * Looks for Australian dollar amounts in typical valuation formats
   */
  const hasNumericalEstimates = (text: string | null | undefined): boolean => {
    if (!text) return false;

    // Patterns for Australian property valuations
    const patterns = [
      // Standard dollar amounts: $500,000 or $1,200,000
      /\$\s*[\d,]+(?:\.\d{2})?/,
      // Million notation: $1.2M or $1.2 million
      /\$\s*[\d.]+\s*(?:m|million)/i,
      // Value ranges: $500,000 - $600,000
      /\$\s*[\d,]+\s*[-–to]+\s*\$\s*[\d,]+/i,
      // Valuation keywords with numbers: "valued at $X" or "estimate: $X"
      /(?:valu(?:e|ation|ed)|estimate|worth|price|assessment)\s*(?:at|of|:)?\s*\$\s*[\d,]+/i,
      // Land value, capital value patterns
      /(?:land|capital|improved|unimproved)\s*value\s*(?:of|:)?\s*\$\s*[\d,]+/i,
      // CV or RV patterns: "CV: $500,000"
      /(?:cv|rv|gv|uv)\s*(?:of|:)?\s*\$\s*[\d,]+/i,
    ];

    return patterns.some(pattern => pattern.test(text));
  };

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      // Add cache-busting timestamp to ensure fresh data
      const response = await fetch(`${API}/properties/${propertyId}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch property');
      const data = await response.json();
      setProperty(data);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  // Delete property handler
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`${API}/properties/${propertyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete property');
      }

      toast.success('Property deleted successfully');
      router.push('/properties');
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast.error(error.message || 'Failed to delete property');
    } finally {
      setDeleting(false);
    }
  };

  // Mark as Sold handler
  const handleMarkAsSold = async () => {
    if (!soldPrice || parseFloat(soldPrice) <= 0) {
      toast.error("Please enter a valid sold price");
      return;
    }

    setMarkingSold(true);
    try {
      const response = await fetch(`${API}/properties/${propertyId}/mark-sold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sold_price: parseFloat(soldPrice),
          sale_date: saleDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark property as sold');
      }

      toast.success('Property marked as sold!');
      setShowSoldModal(false);
      fetchProperty(); // Refresh property data
    } catch (error: any) {
      console.error('Error marking as sold:', error);
      toast.error(error.message || 'Failed to mark as sold');
    } finally {
      setMarkingSold(false);
    }
  };

  // Image gallery navigation
  const nextImage = () => {
    if (property?.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images!.length);
    }
  };

  const prevImage = () => {
    if (property?.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images!.length) % property.images!.length);
    }
  };

  // Auto-fetch coordinates if not set
  useEffect(() => {
    const geocodeProperty = async () => {
      if (!property || property.latitude || !property.location) return;

      try {
        console.log(`[Geocode] Fetching coordinates for: ${property.location}`);
        const response = await fetch(`/api/geocode?address=${encodeURIComponent(property.location)}`);

        if (!response.ok) {
          console.log('[Geocode] Failed to get coordinates');
          return;
        }

        const data = await response.json();
        console.log(`[Geocode] Got coordinates: ${data.latitude}, ${data.longitude}`);

        // Save coordinates to backend
        await fetch(`${API}/properties/${propertyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: data.latitude,
            longitude: data.longitude,
          }),
        });

        // Update local state
        setProperty(prev => prev ? {
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
        } : null);

        console.log('[Geocode] Coordinates saved successfully');
      } catch (error) {
        console.error('[Geocode] Error:', error);
      }
    };

    geocodeProperty();
  }, [property?.id, property?.latitude, property?.location]);

  // RP Data upload handler
  const handleRpDataUpload = async (data: { type: "pdf" | "text"; file?: File; text?: string }) => {
    setUploadingRpData(true);
    try {
      if (data.type === "pdf" && data.file) {
        const formData = new FormData();
        formData.append('file', data.file);
        await fetch(`${API}/properties/${propertyId}/upload-rp-data-pdf`, {
          method: 'POST',
          body: formData,
        });
        await fetchProperty();
        toast.success("PDF uploaded successfully!");
      } else if (data.type === "text" && data.text) {
        await fetch(`${API}/properties/${propertyId}/update-rp-data`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report: data.text }),
        });
        setProperty((prev) => prev ? { ...prev, rp_data_report: data.text } : null);
        toast.success("RP Data report added successfully!");
      }
      setShowRpDataModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to upload RP Data");
    } finally {
      setUploadingRpData(false);
    }
  };

  // Clear RP Data Report handler
  const handleClearRpData = async () => {
    if (!confirm("Are you sure you want to clear the RP Data Report?")) return;

    try {
      await fetch(`${API}/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rp_data_report: null,
          rp_data_upload_date: null
        }),
      });
      setProperty((prev) => prev ? { ...prev, rp_data_report: null } : null);
      toast.success("RP Data report cleared!");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to clear report");
    }
  };

  // Additional Report upload handler
  const handleAdditionalReportUpload = async (data: { type: "pdf" | "text"; file?: File; text?: string }) => {
    setUploadingAdditionalReport(true);
    try {
      if (data.type === "pdf" && data.file) {
        const formData = new FormData();
        formData.append('file', data.file);
        await fetch(`${API}/properties/${propertyId}/upload-additional-report-pdf`, {
          method: 'POST',
          body: formData,
        });
        await fetchProperty();
        toast.success("PDF uploaded successfully!");
      } else if (data.type === "text" && data.text) {
        await fetch(`${API}/properties/${propertyId}/update-additional-report`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report: data.text }),
        });
        setProperty((prev) => prev ? { ...prev, additional_report: data.text } : null);
        toast.success("Additional report added successfully!");
      }
      setShowAdditionalReportModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to add report");
    } finally {
      setUploadingAdditionalReport(false);
    }
  };

  // Clear Additional Report handler
  const handleClearAdditionalReport = async () => {
    if (!confirm("Are you sure you want to clear the Additional Report?")) return;

    try {
      await fetch(`${API}/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additional_report: null }),
      });
      setProperty((prev) => prev ? { ...prev, additional_report: null } : null);
      toast.success("Additional report cleared!");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to clear report");
    }
  };

  // Copy pitch to clipboard
  const copyPitchToClipboard = async () => {
    if (!property?.pitch) return;
    try {
      await navigator.clipboard.writeText(property.pitch);
      setPitchCopied(true);
      toast.success("Pitch copied to clipboard!");
      setTimeout(() => setPitchCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // State for recalculating
  const [recalculating, setRecalculating] = useState(false);
  const [selectedComparableIds, setSelectedComparableIds] = useState<string[]>([]);

  // State for historic sales data from HistoricSalesCard
  // This is the SINGLE SOURCE OF TRUTH for comparable sales - no duplicate logic!
  const [historicSalesData, setHistoricSalesData] = useState<any[]>([]);

  // Initialize selected comparables when property loads
  useEffect(() => {
    if (property?.selected_comparables) {
      setSelectedComparableIds(property.selected_comparables);
    } else if (property?.comparables_data?.comparable_sold) {
      setSelectedComparableIds(property.comparables_data.comparable_sold.map((c: any) => c.id));
    }
  }, [property?.selected_comparables, property?.comparables_data]);

  const handleComparableToggle = (id: string) => {
    setSelectedComparableIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRecalculate = async (selectedIds: string[]) => {
    setRecalculating(true);
    setError(null);

    try {
      const response = await fetch(`${API}/properties/${propertyId}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_comparable_ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to recalculate');
      }

      const data = await response.json();
      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_report: data.evaluation_report,
              comparables_data: data.comparables_data,
              confidence_scoring: data.confidence_scoring,
              valuation_history: data.valuation_history,
              selected_comparables: selectedIds,
              evaluation_date: new Date().toISOString(),
            }
          : null
      );
    } catch (err: any) {
      console.error('Error recalculating:', err);
      setError(err.message || 'Failed to recalculate');
    } finally {
      setRecalculating(false);
    }
  };

  // Handler for when user clicks Evaluate/Re-evaluate button
  const handleEvaluateClick = () => {
    const hasRpData = !!(property?.rp_data_report);
    const hasAdditionalReport = !!(property?.additional_report);
    const rpDataHasEstimates = hasNumericalEstimates(property?.rp_data_report);
    const additionalReportHasEstimates = hasNumericalEstimates(property?.additional_report);

    // If no RP Data or Additional Report, go straight to Homely evaluation
    if (!hasRpData && !hasAdditionalReport) {
      // Show confirmation dialog for Homely-only evaluation
      setShowSourceModal(true);
      return;
    }

    // If reports exist, show the source selection modal
    setShowSourceModal(true);
  };

  // Handler for source modal confirmation
  const handleSourceConfirm = (source: 'homely' | 'reports') => {
    setShowSourceModal(false);
    setEvaluationSource(source);
    evaluateProperty(source);
  };

  const evaluateProperty = async (source: 'homely' | 'reports' = 'homely') => {
    setEvaluating(true);
    setError(null);
    setWarning(null);

    // For Homely source, check that historic sales data is available
    if (source === 'homely') {
      console.log(`[EvaluatePage] Sending ${historicSalesData.length} historic sales to API`);
      if (historicSalesData.length > 0) {
        console.log(`[EvaluatePage] Top 3 sales being sent:`);
        historicSalesData.slice(0, 3).forEach((s, i) => {
          console.log(`  ${i + 1}. ${s.address} - $${s.price} - ${s.similarity}% match - ${s.distance}km`);
        });
      } else {
        console.warn(`[EvaluatePage] WARNING: historicSalesData is EMPTY!`);
        setError('Please wait for the Historic Property Sales section to load before evaluating.');
        setEvaluating(false);
        return;
      }
    } else {
      console.log(`[EvaluatePage] Using RP Data / Additional Report as primary source`);
    }

    try {
      // Use local API route for web scraping evaluation
      // ALWAYS pass Homely data for display in the report (Market Analysis section)
      // The evaluationSource tells the API which data to use for the actual valuation
      const response = await fetch(`/api/properties/${propertyId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicSales: historicSalesData, // Always pass Homely data for display
          evaluationSource: source, // Tell the API which source to prioritize for valuation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to evaluate property');
      }

      const data = await response.json();

      // Check for data source warning
      if (data.domain_api_error) {
        setWarning(data.domain_api_error);
      }

      // Calculate the new estimated value range from the valuation entry
      let newEstimatedValueRange: string | null = null;
      if (data.valuation_history && data.valuation_history.length > 0) {
        const latestValuation = data.valuation_history[0];
        if (latestValuation.value_low && latestValuation.value_high) {
          const formatPrice = (price: number) => '$' + price.toLocaleString();
          newEstimatedValueRange = `${formatPrice(latestValuation.value_low)} - ${formatPrice(latestValuation.value_high)}`;
        }
      }

      // Update local state immediately with evaluation results
      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_report: data.evaluation_report,
              improvements_detected: data.improvements_detected,
              comparables_data: data.comparables_data,
              confidence_scoring: data.confidence_scoring,
              valuation_history: data.valuation_history,
              suburb_trends: data.suburb_trends,
              selected_comparables: data.comparables_data?.comparable_sold?.map((c: any) => c.id) || [],
              evaluation_date: new Date().toISOString(),
              // Update estimated_value_range to match the new valuation
              estimated_value_range: newEstimatedValueRange || prev.estimated_value_range,
            }
          : null
      );

      // Re-fetch from database to confirm save was successful
      // Small delay to ensure backend has processed the save
      setTimeout(async () => {
        try {
          const freshResponse = await fetch(`${API}/properties/${propertyId}?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          });
          if (freshResponse.ok) {
            const freshData = await freshResponse.json();
            // Preserve the new estimated_value_range we calculated, don't let database overwrite it
            setProperty(prev => ({
              ...freshData,
              estimated_value_range: newEstimatedValueRange || freshData.estimated_value_range,
            }));
            console.log('Re-fetched property after evaluation, evaluation_date:', freshData.evaluation_date);
          }
        } catch (e) {
          console.error('Failed to re-fetch after evaluation:', e);
        }
      }, 1000);

    } catch (err: any) {
      console.error('Error evaluating property:', err);
      setError(err.message || 'Failed to evaluate property');
    } finally {
      setEvaluating(false);
    }
  };

  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Social Media Marketing state
  const [generatingFacebookAd, setGeneratingFacebookAd] = useState(false);
  const [generatingFacebookPost, setGeneratingFacebookPost] = useState(false);
  const [facebookAdCopy, setFacebookAdCopy] = useState<{
    primary_text: string;
    headline: string;
    description: string;
    call_to_action: string;
  } | null>(null);
  const [facebookPostContent, setFacebookPostContent] = useState<string | null>(null);

  // AI-Generated Selling Pitch state
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [editedPitch, setEditedPitch] = useState('');

  const handleExportPDF = async () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    setGeneratingPDF(true);
    setError(null);

    try {
      // Calculate price per sqm if we have both price and size
      const pricePerSqm = property.price && property.size
        ? Math.round(property.price / property.size)
        : undefined;

      // Generate and download the PDF (async to fetch images from server)
      const filename = await generateEvaluationPDF(
        property,
        property.evaluation_report,
        property.comparables_data || undefined,
        pricePerSqm
      );

      // Show success message (filename is returned)
      console.log('PDF exported:', filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generateFacebookAd = async () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    setGeneratingFacebookAd(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}/generate-facebook-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate Facebook ad');
      }

      const data = await response.json();
      setFacebookAdCopy(data.ad_copy);
      setShowFbAdModal(true);
      toast.success("Facebook ad generated!");
    } catch (err: any) {
      console.error('Error generating Facebook ad:', err);
      setError(err.message || 'Failed to generate Facebook ad');
    } finally {
      setGeneratingFacebookAd(false);
    }
  };

  const generateFacebookPost = async () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    setGeneratingFacebookPost(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}/generate-facebook-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate Facebook post');
      }

      const data = await response.json();
      setFacebookPostContent(data.post_content);
      setShowFbPostModal(true);
      toast.success("Facebook post generated!");
    } catch (err: any) {
      console.error('Error generating Facebook post:', err);
      setError(err.message || 'Failed to generate Facebook post');
    } finally {
      setGeneratingFacebookPost(false);
    }
  };

  // AI-Generated Selling Pitch functions
  const generatePitch = async () => {
    setGeneratingPitch(true);
    setError(null);

    try {
      const response = await fetch(`${API}/properties/${propertyId}/generate-pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate pitch');
      }

      const data = await response.json();
      setProperty((prev) => prev ? { ...prev, pitch: data.pitch } : null);
    } catch (err: any) {
      console.error('Error generating pitch:', err);
      setError(err.message || 'Failed to generate pitch');
    } finally {
      setGeneratingPitch(false);
    }
  };

  const startEditingPitch = () => {
    setEditedPitch(property?.pitch || '');
    setIsEditingPitch(true);
  };

  const cancelEditingPitch = () => {
    setIsEditingPitch(false);
    setEditedPitch('');
  };

  const saveEditedPitch = async () => {
    if (!editedPitch.trim()) {
      setError('Pitch cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API}/properties/${propertyId}/update-pitch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch: editedPitch }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save pitch');
      }

      setProperty((prev) => prev ? { ...prev, pitch: editedPitch } : null);
      setIsEditingPitch(false);
    } catch (err: any) {
      console.error('Error saving pitch:', err);
      setError(err.message || 'Failed to save pitch');
    }
  };

  const generateAdFromEvaluation = async () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    setGeneratingAd(true);
    setError(null);

    try {
      // Use local API route for ad generation (uses OpenAI)
      const response = await fetch(`/api/properties/${propertyId}/generate-evaluation-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate ad');
      }

      const data = await response.json();
      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_ad: data.ad_content,
            }
          : null
      );
    } catch (err: any) {
      console.error('Error generating ad:', err);
      setError(err.message || 'Failed to generate ad');
    } finally {
      setGeneratingAd(false);
    }
  };

  const startEditingReport = () => {
    setEditedReport(property?.evaluation_report || '');
    setIsEditingReport(true);
  };

  const cancelEditingReport = () => {
    setIsEditingReport(false);
    setEditedReport('');
  };

  const saveEditedReport = async () => {
    if (!editedReport.trim()) {
      setError('Report cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API}/properties/${propertyId}/update-evaluation-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluation_report: editedReport }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save report');
      }

      setProperty((prev) =>
        prev
          ? {
              ...prev,
              evaluation_report: editedReport,
            }
          : null
      );
      setIsEditingReport(false);
    } catch (err: any) {
      console.error('Error saving report:', err);
      setError(err.message || 'Failed to save report');
    }
  };

  const applyValuationToListing = async () => {
    if (!property?.estimated_value_range) {
      setError('No estimated value range available. Please evaluate the property first.');
      return;
    }

    // Parse the estimated_value_range string (e.g., "$800,000 - $850,000" or "$1.2M - $1.4M")
    const rangeText = property.estimated_value_range;
    let priceLow: number | null = null;
    let priceHigh: number | null = null;

    // Try to extract two prices from the range
    const rangeMatch = rangeText.match(/\$\s*([\d,.]+)\s*([mM])?\s*[-–to]+\s*\$\s*([\d,.]+)\s*([mM])?/);

    if (rangeMatch) {
      // Parse low value
      let lowValue = parseFloat(rangeMatch[1].replace(/,/g, ''));
      if (rangeMatch[2]?.toLowerCase() === 'm') {
        lowValue *= 1000000;
      }
      priceLow = Math.round(lowValue);

      // Parse high value
      let highValue = parseFloat(rangeMatch[3].replace(/,/g, ''));
      if (rangeMatch[4]?.toLowerCase() === 'm') {
        highValue *= 1000000;
      }
      priceHigh = Math.round(highValue);
    } else {
      // Try single value pattern
      const singleMatch = rangeText.match(/\$\s*([\d,.]+)\s*([mM])?/);
      if (singleMatch) {
        let value = parseFloat(singleMatch[1].replace(/,/g, ''));
        if (singleMatch[2]?.toLowerCase() === 'm') {
          value *= 1000000;
        }
        priceLow = Math.round(value);
      }
    }

    if (!priceLow || priceLow < 100000 || priceLow > 50000000) {
      setError('Could not parse estimated value range');
      return;
    }

    try {
      // Build update payload with price range
      const updatePayload: { price: number; price_upper?: number; pricing_type?: string } = {
        price: priceLow,
      };

      if (priceHigh && priceHigh > priceLow) {
        updatePayload.price_upper = priceHigh;
        updatePayload.pricing_type = 'range';
      }

      const response = await fetch(`${API}/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to apply valuation');
      }

      setProperty((prev) =>
        prev
          ? {
              ...prev,
              price: priceLow,
              price_upper: priceHigh || undefined,
              pricing_type: priceHigh ? 'range' : prev.pricing_type,
            }
          : null
      );

      if (priceHigh) {
        toast.success(`Listing price updated to $${priceLow.toLocaleString()} - $${priceHigh.toLocaleString()}`);
      } else {
        toast.success(`Listing price updated to $${priceLow.toLocaleString()}`);
      }
    } catch (err: any) {
      console.error('Error applying valuation:', err);
      setError(err.message || 'Failed to apply valuation');
    }
  };

  const openMarketingStrategyModal = () => {
    if (!property?.evaluation_report) {
      setError('Please evaluate the property first');
      return;
    }

    const reportText = property.evaluation_report;

    // Extract marketing strategy text
    let marketingStrategy: string | null = null;
    const strategyPatterns = [
      /Positioning\s*advice[:\s-]+([\s\S]*?)(?=\n\n|\n\d+\.|\n-|$)/i,
      /Marketing\s*strategy[:\s-]+([\s\S]*?)(?=\n\n|\n\d+\.|\n-|$)/i,
      /Recommended\s*approach[:\s-]+([\s\S]*?)(?=\n\n|\n\d+\.|\n-|$)/i,
      /5\.\s*POSITIONING\s*ADVICE[\s\S]*?[-•]([\s\S]*?)(?=\n\n|$)/i,
    ];

    for (const pattern of strategyPatterns) {
      const match = reportText.match(pattern);
      if (match && match[1]) {
        let extracted = match[1]
          .trim()
          .replace(/^[-•*]\s*/gm, '')
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (extracted.length > 50 && extracted.length < 2000) {
          marketingStrategy = extracted;
          break;
        }
      }
    }

    if (!marketingStrategy) {
      // Fallback: use a portion of the evaluation report
      marketingStrategy = reportText.substring(0, 300) + '...';
    }

    // Truncate if too long
    if (marketingStrategy.length > 1000) {
      marketingStrategy = marketingStrategy.substring(0, 997) + '...';
    }

    setMarketingStrategyText(marketingStrategy);

    // Extract pricing options from report
    const options: PricingOption[] = [];

    // Look for "Offers Over" recommendations
    const offersOverMatch = reportText.match(/(?:recommend|suggest|use)[\s\S]*?["']?Offers\s*Over\s*\$?\s*([\d,]+)/i);
    if (offersOverMatch) {
      const price = parseInt(offersOverMatch[1].replace(/,/g, ''));
      if (price >= 100000 && price <= 50000000) {
        options.push({
          type: 'offers_over',
          label: 'Offers Over',
          displayPrice: `Offers Over $${price.toLocaleString()}`,
          price: price,
          description: 'Creates urgency and competitive bidding'
        });
      }
    }

    // Look for "Fixed Price" recommendations
    const fixedPriceMatch = reportText.match(/(?:fixed\s*price|list\s*at|asking\s*price)[\s\S]*?\$?\s*([\d,]+)/i);
    if (fixedPriceMatch) {
      const price = parseInt(fixedPriceMatch[1].replace(/,/g, ''));
      if (price >= 100000 && price <= 50000000) {
        options.push({
          type: 'fixed',
          label: 'Fixed Price',
          displayPrice: `$${price.toLocaleString()}`,
          price: price,
          description: 'Clear, transparent pricing'
        });
      }
    }

    // Look for "Price Guide" or range
    const priceGuideMatch = reportText.match(/(?:price\s*guide|range)[\s\S]*?\$?\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/i);
    if (priceGuideMatch) {
      const lower = parseInt(priceGuideMatch[1].replace(/,/g, ''));
      const upper = parseInt(priceGuideMatch[2].replace(/,/g, ''));
      if (lower >= 100000 && upper <= 50000000) {
        options.push({
          type: 'price_guide',
          label: 'Price Guide',
          displayPrice: `$${lower.toLocaleString()} - $${upper.toLocaleString()}`,
          price: lower,
          priceUpper: upper,
          description: 'Flexible range for negotiations'
        });
      }
    }

    // Add fallback options if no specific recommendations found
    if (options.length === 0 && property.price) {
      options.push(
        {
          type: 'offers_over',
          label: 'Offers Over',
          displayPrice: `Offers Over $${property.price.toLocaleString()}`,
          price: property.price,
          description: 'Recommended for premium positioning'
        },
        {
          type: 'fixed',
          label: 'Fixed Price',
          displayPrice: `$${property.price.toLocaleString()}`,
          price: property.price,
          description: 'Standard pricing approach'
        }
      );
    }

    // Always add Contact Agent and Auction options
    options.push(
      {
        type: 'contact_agent',
        label: 'Contact Agent',
        displayPrice: 'Contact Agent',
        price: null,
        description: 'For exclusive/high-end properties'
      },
      {
        type: 'auction',
        label: 'Auction',
        displayPrice: 'Auction',
        price: null,
        description: 'Competitive bidding environment'
      }
    );

    setPricingOptions(options);
    setShowMarketingModal(true);
  };

  const selectPricingOption = async (option: PricingOption) => {
    setShowMarketingModal(false);

    try {
      const updateData: any = {
        marketing_strategy: marketingStrategyText,
        pricing_type: option.type,
      };

      if (option.price) {
        updateData.price = option.price;
      }
      if (option.priceUpper) {
        updateData.price_upper = option.priceUpper;
      }

      // Use standard property update endpoint
      const response = await fetch(`${API}/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to apply marketing strategy');
      }

      setProperty((prev) =>
        prev
          ? {
              ...prev,
              marketing_strategy: marketingStrategyText,
              pricing_type: option.type,
              price: option.price || prev.price,
              price_upper: option.priceUpper || prev.price_upper,
            }
          : null
      );
      toast.success(`Marketing strategy applied with ${option.label} pricing!`);
    } catch (err: any) {
      console.error('Error applying marketing strategy:', err);
      setError(err.message || 'Failed to apply marketing strategy');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-500 dark:text-gray-400">Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-500 dark:text-gray-400">Property not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Evaluation Source Modal */}
      <EvaluationSourceModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        onConfirm={handleSourceConfirm}
        hasRpData={!!(property?.rp_data_report)}
        hasAdditionalReport={!!(property?.additional_report)}
        rpDataHasEstimates={hasNumericalEstimates(property?.rp_data_report)}
        additionalReportHasEstimates={hasNumericalEstimates(property?.additional_report)}
      />

      {/* Marketing Strategy Modal */}
      {showMarketingModal && (
        <>
          <div
            onClick={() => setShowMarketingModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              zIndex: 10000,
              maxWidth: '550px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1f2937', fontWeight: '700' }}>
                Apply Marketing Strategy
              </h3>
              <p style={{ color: '#6b7280', margin: '0 0 20px 0', fontSize: '14px' }}>
                Select pricing strategy from recommendations:
              </p>

              {pricingOptions.map((option, idx) => (
                <div
                  key={option.type}
                  onClick={() => selectPricingOption(option)}
                  style={{
                    border: `2px solid ${idx === 0 ? '#059669' : '#e5e7eb'}`,
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    background: idx === 0 ? '#ecfdf5' : 'white',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#059669';
                    e.currentTarget.style.background = '#ecfdf5';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = idx === 0 ? '#059669' : '#e5e7eb';
                    e.currentTarget.style.background = idx === 0 ? '#ecfdf5' : 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#059669', marginBottom: '6px' }}>
                        {option.displayPrice}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {option.description}
                      </div>
                    </div>
                    {idx === 0 && (
                      <div
                        style={{
                          background: '#059669',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        RECOMMENDED
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginTop: '20px',
                  padding: '14px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  borderLeft: '4px solid #059669',
                }}
              >
                <div style={{ fontSize: '13px', color: '#374151', fontWeight: '500', marginBottom: '6px' }}>
                  Marketing Strategy Preview:
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
                  {marketingStrategyText.substring(0, 150)}...
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-gray-800 dark:to-gray-800 border-b border-cyan-700 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="text-white dark:text-cyan-500" size={24} />
            <span className="text-lg font-extrabold text-white dark:text-cyan-500">
              PropertyPitch
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => router.push('/properties')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 dark:bg-gray-700 border border-white/30 dark:border-gray-600 rounded-lg text-white dark:text-gray-200 font-medium hover:bg-white/30 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={() => setShowPropertyEdit(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
            >
              <Edit size={16} />
              Edit Property
            </button>
            {property && property.status !== "sold" && (
              <button
                onClick={() => setShowSoldModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors"
              >
                <DollarSign size={16} />
                Mark as Sold
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              Delete
            </button>
            <DarkModeToggle />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 hover:bg-white/20 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu size={24} className="text-white dark:text-gray-300" />
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between px-4 py-2 mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme</span>
              <DarkModeToggle />
            </div>
            <button
              onClick={() => { router.push('/properties'); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium"
            >
              <ArrowLeft size={18} />
              Back to Properties
            </button>
            <button
              onClick={() => { setShowPropertyEdit(true); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-500 text-white rounded-lg font-semibold"
            >
              <Edit size={18} />
              Edit Property
            </button>
            {property && property.status !== "sold" && (
              <button
                onClick={() => { setShowSoldModal(true); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold"
              >
                <DollarSign size={18} />
                Mark as Sold
              </button>
            )}
            <button
              onClick={() => { handleDelete(); setShowMobileMenu(false); }}
              disabled={deleting}
              className="w-full flex items-center gap-3 px-4 py-3 bg-red-500 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        )}
      </header>

      {/* Property Edit Modal */}
      {showPropertyEdit && property && (
        <PropertyEdit
          property={property as any}
          isOpen={showPropertyEdit}
          userEmail={userEmail}
          onClose={() => setShowPropertyEdit(false)}
          onSave={() => {
            setShowPropertyEdit(false);
            fetchProperty();
          }}
        />
      )}

      {/* Mark as Sold Modal */}
      {showSoldModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-emerald-500 mb-2 flex items-center gap-2">
              <span className="text-2xl">💰</span>
              Mark as Sold
            </h2>
            <p className="text-gray-500 mb-6">Enter the final sale details for this property.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sold Price ($)</label>
                <input
                  type="number"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  placeholder="e.g., 850000"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none text-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sale Date</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSoldModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsSold}
                disabled={markingSold}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 border-2 border-emerald-600"
              >
                {markingSold ? "Saving..." : "Mark as Sold"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1200px] mx-auto p-4">

        {/* Warning Message */}
        {warning && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              color: '#b45309',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span>{warning}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Property Summary Header */}
        <div className="mb-4 p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl">
          <h1 className="text-xl font-bold mb-1 text-blue-900 dark:text-blue-200 flex items-center gap-2">
            💰 Property Valuation
          </h1>
          {/*<h2 className="text-base text-blue-800 dark:text-blue-300 mb-3 break-words">{property.location}</h2>
          <div className="flex gap-4 flex-wrap text-sm text-blue-800 dark:text-blue-300">
            <div>
              <strong>{property.beds}</strong> Bedrooms
            </div>
            <div>
              <strong>{property.baths}</strong> Bathrooms
            </div>
            <div>
              <strong>{property.carpark}</strong> Car Parks
            </div>
            {property.size && (
              <div>
                <strong>{property.size}</strong> sqm
              </div>
            )}
            {property.price && (
              <div className="text-emerald-600 dark:text-emerald-400 font-bold">Listed: ${property.price.toLocaleString()}</div>
            )}
          </div>*/}
        </div>

          {/* Property Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          {/* Location */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-start gap-2">
            <MapPin size={24} className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
            {property.location}
          </h1>
          {/* Coordinates */}
          {property.latitude && property.longitude ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 mb-4 inline-flex items-center gap-1 ml-8"
            >
              📍 {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)}
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          ) : (
            <p className="text-xs text-gray-300 dark:text-gray-600 mb-4 ml-8">Fetching coordinates...</p>
          )}

          {/* Property Stats */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mb-4 text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <Bed size={20} className="text-cyan-500" />
              <span><strong>{property.beds}</strong> Bedrooms</span>
            </div>
            <div className="flex items-center gap-2">
              <Bath size={20} className="text-emerald-500" />
              <span><strong>{property.baths}</strong> Bathrooms</span>
            </div>
            <div className="flex items-center gap-2">
              <Car size={20} className="text-blue-500" />
              <span><strong>{property.carpark}</strong> Car Parks</span>
            </div>
            {property.size && (
              <div className="flex items-center gap-2">
                <Ruler size={20} className="text-purple-500" />
                <span><strong>{property.size}</strong> sqm</span>
              </div>
            )}
          </div>

          {/* Property Type Badge */}
          {property.property_type && (
            <span className="inline-block px-4 py-1.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full font-semibold text-sm">
              {property.property_type}
            </span>
          )}

          {/* Sold Badge */}
          {property.status === "sold" && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-bold">
              <DollarSign size={18} />
              SOLD - ${property.sold_price?.toLocaleString()}
            </div>
          )}
        </div>

        {/* Image Gallery */}
        {property.images && property.images.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden mb-6 shadow-lg">
            <img
              src={property.images[currentImageIndex]}
              alt={`Property ${currentImageIndex + 1}`}
              className="w-full h-64 sm:h-80 md:h-96 object-cover"
            />
            {property.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/90 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                >
                  <ChevronLeft size={24} className="text-gray-700" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/90 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                >
                  <ChevronRight size={24} className="text-gray-700" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/70 text-white px-4 py-2 rounded-full text-sm font-medium">
                  {currentImageIndex + 1} / {property.images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Features */}
        {property.features && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Features</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{property.features}</p>
          </div>
        )}

        {/* RP Data Report */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-xl">📊</span>
              RP Data Report
            </h2>
            <div className="flex gap-2">
              {property.rp_data_report && (
                <button
                  onClick={handleClearRpData}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors text-sm"
                >
                  <Trash2 size={16} />
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowRpDataModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors text-sm"
              >
                <Upload size={16} />
                {property.rp_data_report ? 'Update' : 'Add'} RP Data
              </button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
            {!property.rp_data_report ? (
              <div className="text-center">
                <p className="font-semibold text-amber-800 dark:text-amber-300 mb-2">Have personal access to RP Data?</p>
                <p className="text-amber-700 dark:text-amber-400 text-sm mb-2">
                  If you have a personal RP Data subscription, you can add the report here to enhance your property evaluation with premium market data.
                </p>
                <p className="text-amber-600 dark:text-amber-500 text-sm italic">
                  RP Data provides comprehensive property history, comparable sales, and market insights.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-sans">
                  {property.rp_data_report}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Additional Report */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-xl">📄</span>
              Additional Report
            </h2>
            <div className="flex gap-2">
              {property.additional_report && (
                <button
                  onClick={handleClearAdditionalReport}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors text-sm"
                >
                  <Trash2 size={16} />
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowAdditionalReportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors text-sm"
              >
                <Upload size={16} />
                {property.additional_report ? 'Update' : 'Add'} Report
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
            {!property.additional_report ? (
              <div className="text-center">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Add Additional Property Report</p>
                <p className="text-blue-700 dark:text-blue-400 text-sm mb-2">
                  Upload any additional property reports, valuations, or documents to enhance your property analysis.
                </p>
                <p className="text-blue-600 dark:text-blue-500 text-sm italic">
                  Supports PDF uploads or text paste for custom reports and data.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-sans">
                  {property.additional_report}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Historic Sales Card - ALWAYS render to populate data before evaluation */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
          <HistoricSalesCard
            propertyId={propertyId}
            propertyLocation={property.location}
            propertyType={property.property_type}
            propertyBeds={property.beds}
            propertyBaths={property.baths}
            propertyLandArea={property.size}
            propertyLatitude={property.latitude}
            propertyLongitude={property.longitude}
            variant="purple"
            maxItems={15}
            showSourceLink={true}
            onSalesProcessed={setHistoricSalesData}
          />
        </div>

        {/* Evaluation Section */}
        {!property.evaluation_report ? (
          <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
              Get Your AI Property Valuation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-[600px] mx-auto">
              Our AI analyzes your property photos to detect improvements, then compares with market data.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem', maxWidth: '900px', margin: '0 auto 2rem' }}>
              <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '12px', border: '2px solid #bbf7d0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#14532d' }}>Photo Analysis</h4>
                <p style={{ color: '#166534', fontSize: '0.9rem', margin: 0 }}>AI detects renovations, extra rooms, and quality improvements</p>
              </div>

              <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '2px solid #bae6fd' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📈</div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#0c4a6e' }}>Market Data</h4>
                <p style={{ color: '#075985', fontSize: '0.9rem', margin: 0 }}>Compares with Homely.com.au and any property report data pasted in</p>
              </div>

              <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '12px', border: '2px solid #fbbf24' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#78350f' }}>Value Adjustments</h4>
                <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>Calculates impact of detected improvements on value</p>
              </div>
            </div>

            <button
              onClick={handleEvaluateClick}
              disabled={evaluating}
              style={{
                background: evaluating ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '1.25rem 2.5rem',
                borderRadius: '12px',
                border: 'none',
                cursor: evaluating ? 'not-allowed' : 'pointer',
                fontSize: '1.1rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              ✨ {evaluating ? 'Evaluating... Please wait up to 2 minutes' : 'Start Property Evaluation'}
            </button>

            {(!property.images || property.images.length === 0) && (
              <div
                style={{
                  background: '#fef3c7',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  border: '2px solid #fbbf24',
                  maxWidth: '600px',
                  margin: '2rem auto 0',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#92400e', fontSize: '0.95rem', margin: 0 }}>
                  ⚠️ <strong>No photos uploaded.</strong> Evaluation will be based on property specifications, comparable sales, and current market data. For more accurate valuation including condition assessment, add photos to the property listing.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Photo Gallery */}
            {property.images && property.images.length > 0 && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '2px solid #cbd5e1',
                  marginBottom: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📸 Property Photos ({property.images.length})
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {property.images.map((img, idx) => (
                    <div
                      key={idx}
                      style={{
                        aspectRatio: '4/3',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <img
                        src={img}
                        alt={`Property photo ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements Detected */}
            {property.improvements_detected && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '2px solid #fbbf24',
                  marginBottom: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📈 Improvements Detected from Photos
                </h3>
                <div style={{ color: '#78350f', fontSize: '1rem', whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                  {property.improvements_detected}
                </div>
              </div>
            )}

           

            {/* Additional Report - Source Data */}
            {property.additional_report && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '2px solid #2dd4bf',
                  marginBottom: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#115e59', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📄 Additional Report (Source Data)
                </h3>
                <div
                  style={{
                    color: '#134e4a',
                    fontSize: '0.95rem',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.8',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'rgba(255,255,255,0.5)',
                    padding: '1rem',
                    borderRadius: '8px',
                  }}
                >
                  {property.additional_report}
                </div>
              </div>
            )}

            {/* Re-evaluate Button - Above Report */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={handleEvaluateClick}
                disabled={evaluating}
                style={{
                  background: evaluating ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: evaluating ? 'not-allowed' : 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                ✨ {evaluating ? 'Re-evaluating...' : 'Re-evaluate Property'}
              </button>
            </div>

            {/* Evaluation Report */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                padding: '2.5rem',
                borderRadius: '16px',
                border: '2px solid #bbf7d0',
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💰 Comprehensive Valuation Report
                </h3>
                {!isEditingReport && (
                  <button
                    onClick={startEditingReport}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    ✏️ Edit Report
                  </button>
                )}
              </div>

              {/* Estimated Value Range Display */}
              {property.estimated_value_range && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    border: '2px solid #f59e0b',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>🎯</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Estimated Value Range
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#78350f' }}>
                      {property.estimated_value_range}
                    </div>
                  </div>
                </div>
              )}

              {isEditingReport ? (
                <div>
                  <textarea
                    value={editedReport}
                    onChange={(e) => setEditedReport(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '400px',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '2px solid #10b981',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      lineHeight: '1.9',
                      color: '#14532d',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEditingReport}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                      }}
                    >
                      ✕ Cancel
                    </button>
                    <button
                      onClick={saveEditedReport}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      💾 Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#14532d', fontSize: '1rem', whiteSpace: 'pre-wrap', lineHeight: '1.9' }}>
                  {property.evaluation_report}
                </div>
              )}
            </div>

            {/* Data Source Status - BIG CLEAR INDICATOR */}
            {property.comparables_data && (property.comparables_data.data_source?.includes('Realestate') || property.comparables_data.data_source?.includes('Domain') || property.comparables_data.data_source?.includes('Homely')) && property.comparables_data.statistics?.total_found > 0 ? (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                border: '3px solid #22c55e',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#15803d', marginBottom: '0.25rem' }}>
                  {property.comparables_data.data_source}
                </div>
                <div style={{ fontSize: '1rem', color: '#166534' }}>
                  {property.comparables_data.statistics?.total_found || 0} comparable sold properties found
                </div>
              </div>
            ) : null}

            {/* Valuation Quality Section */}
            <div style={{ marginBottom: '2rem' }}>
              <ValuationQuality
                valuationHistory={property.valuation_history}
                confidenceScoring={property.confidence_scoring}
                suburbTrends={property.suburb_trends}
                comparables={property.comparables_data?.comparable_sold}
                selectedComparables={selectedComparableIds}
                onComparableToggle={handleComparableToggle}
                onRecalculate={handleRecalculate}
                currentValue={property.comparables_data?.statistics?.price_range?.median || undefined}
              />
              {recalculating && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#dbeafe',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#1e40af'
                }}>
                  Recalculating valuation with selected comparables...
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', padding: '1rem 0' }}>
              {/* Export as PDF - DISABLED
              <button
                onClick={handleExportPDF}
                disabled={generatingPDF}
                style={{
                  background: generatingPDF ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: generatingPDF ? 'not-allowed' : 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                📥 {generatingPDF ? 'Generating PDF...' : 'Export as PDF'}
              </button>
              */}

              {/* Create Marketing Ad - DISABLED
              <button
                onClick={generateAdFromEvaluation}
                disabled={generatingAd}
                style={{
                  background: generatingAd ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: generatingAd ? 'not-allowed' : 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                📘 {generatingAd ? 'Generating Ad...' : 'Create Marketing Ad'}
              </button>
              */}
            </div>

            {/* AI-Generated Selling Pitch Section */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                padding: '2rem',
                borderRadius: '16px',
                border: '2px solid #7dd3fc',
                marginTop: '2rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✨ AI-Generated Selling Pitch
                </h3>
                {property.pitch && !isEditingPitch && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={copyPitchToClipboard}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {pitchCopied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    <button
                      onClick={startEditingPitch}
                      style={{
                        background: '#0ea5e9',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={generatePitch}
                      disabled={generatingPitch}
                      style={{
                        background: generatingPitch ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: generatingPitch ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      🔄 {generatingPitch ? '...' : 'Regenerate'}
                    </button>
                  </div>
                )}
              </div>

              {property.pitch ? (
                isEditingPitch ? (
                  <div>
                    <textarea
                      value={editedPitch}
                      onChange={(e) => setEditedPitch(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '200px',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '2px solid #0ea5e9',
                        fontSize: '1rem',
                        lineHeight: '1.8',
                        color: '#0c4a6e',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={cancelEditingPitch}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                        }}
                      >
                        ✕ Cancel
                      </button>
                      <button
                        onClick={saveEditedPitch}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                        }}
                      >
                        💾 Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', color: '#0c4a6e', fontSize: '1rem', lineHeight: '1.8' }}>
                    {property.pitch}
                  </div>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p style={{ color: '#0369a1', marginBottom: '1rem' }}>
                    Generate a professional, AI-powered selling pitch for this property.
                  </p>
                  <button
                    onClick={generatePitch}
                    disabled={generatingPitch}
                    style={{
                      background: generatingPitch ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                      color: 'white',
                      padding: '1rem 2rem',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: generatingPitch ? 'not-allowed' : 'pointer',
                      fontSize: '1.05rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    ✨ {generatingPitch ? 'Generating Pitch...' : 'Generate Pitch'}
                  </button>
                </div>
              )}
            </div>

            {/* Apply to Listing Price Button - MUST be above Social Media Marketing */}
            <div style={{ padding: '1rem 0', marginTop: '1rem' }}>
              <button
                onClick={applyValuationToListing}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                💲 Apply to Listing Price
              </button>
            </div>

            {/* Apply Marketing Strategy Button */}
            <div style={{ padding: '1rem 0' }}>
              <button
                onClick={openMarketingStrategyModal}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                📈 Apply Marketing Strategy
              </button>
            </div>

            {/* Social Media Marketing Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mt-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Social Media Marketing</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Facebook Ad */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                  <h3 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-2">
                    <FacebookIcon />
                    Facebook Ad
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Create a paid Facebook ad with optimized copy, headline, and call-to-action.
                  </p>
                  <button
                    onClick={generateFacebookAd}
                    disabled={generatingFacebookAd}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {generatingFacebookAd ? "Generating..." : "Generate Ad"}
                  </button>
                </div>

                {/* Facebook Post */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                  <h3 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-2">
                    <Share2 size={20} className="text-emerald-600" />
                    Facebook Post
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    Create an engaging organic post with all property details and photos.
                  </p>
                  <button
                    onClick={generateFacebookPost}
                    disabled={generatingFacebookPost}
                    className="w-full py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {generatingFacebookPost ? "Generating..." : "Generate Post"}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Ad */}
            {property.evaluation_ad && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                  padding: '2.5rem',
                  borderRadius: '16px',
                  border: '2px solid #c4b5fd',
                  marginTop: '2rem',
                }}
              >
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📘 Marketing Ad (Based on Evaluation)
                </h3>
                <div
                  style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontSize: '1rem',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap',
                    marginBottom: '1.5rem',
                  }}
                >
                  {property.evaluation_ad}
                </div>
                <button
                  onClick={() => copyToClipboard(property.evaluation_ad || '', 'Ad')}
                  style={{
                    background: '#7c3aed',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                >
                  📋 Copy Ad to Clipboard
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* RP Data Modal */}
      <ReportUploadModal
        isOpen={showRpDataModal}
        onClose={() => setShowRpDataModal(false)}
        onUpload={handleRpDataUpload}
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
        onUpload={handleAdditionalReportUpload}
        title="Add Additional Report"
        description="Upload your report as a PDF file."
        textPlaceholder="Paste your report content here..."
        accentColor="blue"
        isUploading={uploadingAdditionalReport}
      />

      {/* Facebook Ad Modal */}
      {showFbAdModal && facebookAdCopy && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <FacebookIcon />
                <h2 className="text-xl font-bold text-gray-900">Facebook Ad Preview</h2>
              </div>
              <button onClick={() => setShowFbAdModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Ad Preview */}
            <div className="bg-gray-100 rounded-xl overflow-hidden mb-5">
              <div className="bg-white p-3">
                <div className="font-semibold text-sm">Your Real Estate Page</div>
                <div className="text-xs text-gray-500">Sponsored</div>
              </div>
              <div className="bg-white px-3 pb-3 text-sm">{facebookAdCopy.primary_text}</div>
              {property?.images?.[0] && (
                <img src={property.images[0]} alt="Ad" className="w-full aspect-video object-cover" />
              )}
              <div className="bg-white p-3">
                <div className="font-semibold">{facebookAdCopy.headline}</div>
                <div className="text-gray-500 text-sm">{facebookAdCopy.description}</div>
                <button className="w-full mt-2 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold text-sm">
                  {facebookAdCopy.call_to_action?.replace(/_/g, ' ')}
                </button>
              </div>
            </div>

            {/* Copy Buttons */}
            <div className="space-y-3 mb-5">
              {[
                { label: 'Headline', value: facebookAdCopy.headline },
                { label: 'Primary Text', value: facebookAdCopy.primary_text },
                { label: 'Description', value: facebookAdCopy.description },
                { label: 'Call to Action', value: facebookAdCopy.call_to_action }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{item.label}</div>
                  <div className="text-gray-800 pr-10">{item.value}</div>
                  <button
                    onClick={() => copyToClipboard(item.value, item.label)}
                    className="absolute top-4 right-4 p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Copy size={14} className="text-gray-500" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowFbAdModal(false)}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Facebook Post Modal */}
      {showFbPostModal && facebookPostContent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <Share2 className="text-emerald-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Facebook Post Preview</h2>
              </div>
              <button onClick={() => setShowFbPostModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-5 mb-5">
              <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans text-sm">
                {facebookPostContent}
              </pre>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(facebookPostContent, "Post")}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                onClick={() => setShowFbPostModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
