"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft, Home, Loader2, Bed, Bath, Car, MapPin, DollarSign, Ruler,
  Edit, Trash2, ChevronLeft, ChevronRight, Sparkles, Share2,
  X, Save, Upload, Menu
} from "lucide-react";
import { API } from "@/lib/config";
import ReportUploadModal from "@/components/ReportUploadModal";
import { usePageView } from "@/hooks/useAudit";

// Using a different Facebook icon to avoid deprecation warning
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
  price?: number | null;
  property_type?: string | null;
  size?: number | null;
  features?: string | null;
  images?: string[];
  created_at?: string;
  pitch?: string | null;
  strata_body_corps?: number | null;
  council_rates?: number | null;
  rp_data_report?: string | null;
  rp_data_upload_date?: string | null;
  additional_report?: string | null;
  status?: string;
  sold_price?: number | null;
  sale_date?: string | null;
}

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  // Track page view for audit with property ID
  usePageView('property-detail', propertyId ? parseInt(propertyId, 10) || 0 : 0);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Pitch editing states
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [editedPitch, setEditedPitch] = useState("");
  const [generatingPitch, setGeneratingPitch] = useState(false);

  // Facebook states
  const [generatingFbAd, setGeneratingFbAd] = useState(false);
  const [generatingFbPost, setGeneratingFbPost] = useState(false);
  const [showFbAdModal, setShowFbAdModal] = useState(false);
  const [showFbPostModal, setShowFbPostModal] = useState(false);
  const [fbAdCopy, setFbAdCopy] = useState<any>(null);
  const [fbPostContent, setFbPostContent] = useState<string | null>(null);

  // Report modal states
  const [showRpDataModal, setShowRpDataModal] = useState(false);
  const [uploadingRpData, setUploadingRpData] = useState(false);
  const [showAdditionalReportModal, setShowAdditionalReportModal] = useState(false);
  const [uploadingAdditionalReport, setUploadingAdditionalReport] = useState(false);

  // Sold modal states
  const [showSoldModal, setShowSoldModal] = useState(false);

  // Historic sales states
  const [historicSales, setHistoricSales] = useState<any[]>([]);
  const [historicSalesLoading, setHistoricSalesLoading] = useState(false);
  const [historicSalesError, setHistoricSalesError] = useState<string | null>(null);
  const [historicSalesInfo, setHistoricSalesInfo] = useState<{ suburb: string; state: string; postcode: string | null; propertyType: string; searchedAt: string | null; cached: boolean; scrapedUrl?: string; debug?: string } | null>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [markingSold, setMarkingSold] = useState(false);

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API}/properties/${propertyId}`);
      setProperty(response.data);
    } catch (error: any) {
      console.error("Error fetching property:", error);
      const message = error.response?.data?.detail || "Failed to load property";
      toast.error(message);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  // Fetch historic sales when property loads
  const fetchHistoricSales = async () => {
    setHistoricSalesLoading(true);
    setHistoricSalesError(null);
    try {
      const response = await fetch(`/api/properties/${propertyId}/historic-sales`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch historic sales');
      }
      setHistoricSales(data.sales || []);
      setHistoricSalesInfo({
        suburb: data.suburb,
        state: data.state,
        postcode: data.postcode,
        propertyType: data.propertyType || 'all',
        searchedAt: data.searchedAt || null,
        cached: data.cached || false,
        scrapedUrl: data.scrapedUrl || null,
        debug: data.debug || null
      });

      // Show toast based on whether data was cached or freshly scraped
      if (data.cached) {
        toast.info(`Using cached ${data.propertyType} sales data (${data.total} results)`);
      } else {
        toast.success(`Fetched ${data.total} ${data.propertyType} sales from Homely.com.au`);
      }
    } catch (error: any) {
      console.error("Error fetching historic sales:", error);
      setHistoricSalesError(error.message);
      toast.error("Failed to fetch historic sales");
    } finally {
      setHistoricSalesLoading(false);
    }
  };

  // Fetch historic sales when property is loaded
  useEffect(() => {
    if (property && propertyId) {
      fetchHistoricSales();
    }
  }, [property?.id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`${API}/properties/${propertyId}`);
      toast.success("Property deleted successfully");
      router.push("/");
    } catch (error: any) {
      console.error("Error deleting property:", error);
      const message = error.response?.data?.detail || "Failed to delete property";
      toast.error(message);
    } finally {
      setDeleting(false);
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

  // Pitch functions
  const generatePitch = async () => {
    setGeneratingPitch(true);
    try {
      const response = await axios.post(`${API}/properties/${propertyId}/generate-pitch`);
      setProperty((prev) => prev ? { ...prev, pitch: response.data.pitch } : null);
      toast.success("Pitch generated successfully!");
    } catch (error: any) {
      console.error("Error generating pitch:", error);
      toast.error(error.response?.data?.detail || "Failed to generate pitch");
    } finally {
      setGeneratingPitch(false);
    }
  };

  const startEditingPitch = () => {
    setEditedPitch(property?.pitch || "");
    setIsEditingPitch(true);
  };

  const cancelEditingPitch = () => {
    setIsEditingPitch(false);
    setEditedPitch("");
  };

  const saveEditedPitch = async () => {
    if (!editedPitch.trim()) {
      toast.error("Pitch cannot be empty");
      return;
    }

    try {
      await axios.put(`${API}/properties/${propertyId}/update-pitch`, { pitch: editedPitch });
      setProperty((prev) => prev ? { ...prev, pitch: editedPitch } : null);
      setIsEditingPitch(false);
      toast.success("Pitch updated successfully!");
    } catch (error: any) {
      console.error("Error updating pitch:", error);
      toast.error("Failed to update pitch");
    }
  };

  // Facebook Ad functions
  const generateFacebookAd = async () => {
    setGeneratingFbAd(true);
    try {
      const response = await axios.post(`${API}/properties/${propertyId}/generate-facebook-ad`, {}, { timeout: 30000 });
      if (response.data?.ad_copy) {
        setFbAdCopy(response.data.ad_copy);
        setShowFbAdModal(true);
        toast.success("Facebook ad generated!");
      }
    } catch (error: any) {
      console.error("Error generating Facebook ad:", error);
      toast.error(error.response?.data?.detail || "Failed to generate Facebook ad");
    } finally {
      setGeneratingFbAd(false);
    }
  };

  // Facebook Post functions
  const generateFacebookPost = async () => {
    setGeneratingFbPost(true);
    try {
      const response = await axios.post(`${API}/properties/${propertyId}/generate-facebook-post`, {}, { timeout: 30000 });
      if (response.data?.post_content) {
        setFbPostContent(response.data.post_content);
        setShowFbPostModal(true);
        toast.success("Facebook post generated!");
      }
    } catch (error: any) {
      console.error("Error generating Facebook post:", error);
      toast.error(error.response?.data?.detail || "Failed to generate Facebook post");
    } finally {
      setGeneratingFbPost(false);
    }
  };

  // RP Data upload handler
  const handleRpDataUpload = async (data: { type: "pdf" | "text"; file?: File; text?: string }) => {
    setUploadingRpData(true);
    try {
      if (data.type === "pdf" && data.file) {
        const formData = new FormData();
        formData.append('file', data.file);
        await axios.post(`${API}/properties/${propertyId}/upload-rp-data-pdf`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await fetchProperty();
        toast.success("PDF uploaded successfully!");
      } else if (data.type === "text" && data.text) {
        await axios.put(`${API}/properties/${propertyId}/update-rp-data`, { report: data.text });
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
      // Use backend's property update endpoint to clear the fields
      await axios.patch(`${API}/properties/${propertyId}`, {
        rp_data_report: null,
        rp_data_upload_date: null
      });
      setProperty((prev) => prev ? { ...prev, rp_data_report: null, rp_data_upload_date: null } : null);
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
        await axios.post(`${API}/properties/${propertyId}/upload-additional-report-pdf`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await fetchProperty();
        toast.success("PDF uploaded successfully!");
      } else if (data.type === "text" && data.text) {
        await axios.put(`${API}/properties/${propertyId}/update-additional-report`, { report: data.text });
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
      // Use backend's property update endpoint to clear the field
      await axios.patch(`${API}/properties/${propertyId}`, {
        additional_report: null
      });
      setProperty((prev) => prev ? { ...prev, additional_report: null } : null);
      toast.success("Additional report cleared!");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to clear report");
    }
  };

  // Mark as Sold
  const handleMarkAsSold = async () => {
    if (!soldPrice || parseFloat(soldPrice) <= 0) {
      toast.error("Please enter a valid sold price");
      return;
    }
    const finalSaleDate = saleDate && saleDate.trim() !== ''
      ? saleDate
      : new Date().toISOString().split('T')[0];

    setMarkingSold(true);
    try {
      const response = await axios.post(`${API}/properties/${propertyId}/mark-sold`, {
        sold_price: parseFloat(soldPrice),
        sale_date: finalSaleDate
      });
      if (response.data.success) {
        toast.success("Property marked as sold!");
        setShowSoldModal(false);
        fetchProperty();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to mark as sold");
    } finally {
      setMarkingSold(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 to-emerald-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-500" size={48} />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 to-emerald-50 flex items-center justify-center">
        <p className="text-gray-600">Property not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-emerald-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="text-cyan-500" size={24} />
            <span className="text-lg font-extrabold bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent">
              PropertyPitch
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Properties
            </button>
            <button
              onClick={() => router.push(`/property/${propertyId}/evaluation`)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
            >
              <DollarSign size={16} />
              Property Valuation
            </button>
            <button
              onClick={() => router.push(`/property/${propertyId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
            >
              <Edit size={16} />
              Edit Property
            </button>
            {property.status !== "sold" && (
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
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2">
            <button
              onClick={() => { router.push('/'); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg text-gray-700 font-medium"
            >
              <ArrowLeft size={18} />
              Back to Properties
            </button>
            <button
              onClick={() => { router.push(`/property/${propertyId}/evaluation`); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500 text-white rounded-lg font-semibold"
            >
              <DollarSign size={18} />
              Property Valuation
            </button>
            <button
              onClick={() => { router.push(`/property/${propertyId}/edit`); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-cyan-500 text-white rounded-lg font-semibold"
            >
              <Edit size={18} />
              Edit Property
            </button>
            {property.status !== "sold" && (
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

      <main className="max-w-4xl mx-auto px-4 py-6">
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

        {/* Property Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          {/* Location */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-start gap-2">
            <MapPin size={24} className="text-gray-400 flex-shrink-0 mt-1" />
            {property.location}
          </h1>

          {/* Property Stats */}
          <div className="flex flex-wrap gap-4 sm:gap-6 mb-4 text-gray-600">
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
            <span className="inline-block px-4 py-1.5 bg-cyan-50 text-cyan-600 rounded-full font-semibold text-sm">
              {property.property_type}
            </span>
          )}

          {/* Sold Badge */}
          {property.status === "sold" && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold">
              <DollarSign size={18} />
              SOLD - ${property.sold_price?.toLocaleString()}
            </div>
          )}
        </div>

        {/* Features */}
        {property.features && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Features</h2>
            <p className="text-gray-600 leading-relaxed">{property.features}</p>
          </div>
        )}

        {/* Historic Sales in Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl">🏠</span>
              Historic {property.property_type || ''} Sales
              {historicSalesInfo && (
                <span className="text-sm font-normal text-gray-500">
                  ({historicSalesInfo.suburb}, {historicSalesInfo.state} {historicSalesInfo.postcode})
                </span>
              )}
            </h2>
            <button
              onClick={() => fetchHistoricSales()}
              disabled={historicSalesLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors text-sm disabled:opacity-50"
            >
              {historicSalesLoading ? <Loader2 className="animate-spin" size={16} /> : <Home size={16} />}
              {historicSalesLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Showing recent {property.property_type?.toLowerCase() || 'property'} sales in this area.
            {historicSalesInfo?.searchedAt && (
              <span className="ml-1">
                Data {historicSalesInfo.cached ? 'cached' : 'fetched'} on {new Date(historicSalesInfo.searchedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
              </span>
            )}
            {historicSalesInfo?.scrapedUrl ? (
              <span className="ml-1">
                Source: <a href={historicSalesInfo.scrapedUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 underline hover:text-purple-800">{historicSalesInfo.scrapedUrl}</a>
              </span>
            ) : (
              <span className="ml-1">Source: Homely.com.au</span>
            )}
          </p>

          <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
            {historicSalesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                <p className="text-purple-700">Loading historic sales from Homely.com.au...</p>
              </div>
            ) : historicSalesError ? (
              <div className="text-center py-4">
                <p className="text-red-600 font-semibold">Error loading sales data</p>
                <p className="text-red-500 text-sm">{historicSalesError}</p>
              </div>
            ) : historicSales.length === 0 ? (
              <div className="text-center py-4">
                <p className="font-semibold text-purple-800 mb-2">No recent sales found</p>
                <p className="text-purple-700 text-sm mb-2">
                  No sold properties found in this area. Try clicking Refresh to fetch the latest data.
                </p>
                {historicSalesInfo?.debug && (
                  <details className="text-left mt-3 bg-white rounded-lg p-3 border border-purple-200">
                    <summary className="cursor-pointer text-sm font-semibold text-purple-700">Debug Info</summary>
                    <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-all max-h-40 overflow-auto">
                      {historicSalesInfo.debug}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {historicSales.map((sale: any) => (
                  <div
                    key={sale.id}
                    className="bg-white rounded-lg p-4 border border-purple-100 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{sale.address}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {sale.beds && <span className="flex items-center gap-1"><Bed size={12} /> {sale.beds}</span>}
                          {sale.baths && <span className="flex items-center gap-1"><Bath size={12} /> {sale.baths}</span>}
                          {sale.cars && <span className="flex items-center gap-1"><Car size={12} /> {sale.cars}</span>}
                          {sale.land_area && <span className="flex items-center gap-1"><Ruler size={12} /> {sale.land_area} m²</span>}
                          <span className="text-purple-600">{sale.property_type}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">${sale.price?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{sale.sold_date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RP Data Report */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
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

          <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
            {!property.rp_data_report ? (
              <div className="text-center">
                <p className="font-semibold text-amber-800 mb-2">Have personal access to RP Data?</p>
                <p className="text-amber-700 text-sm mb-2">
                  If you have a personal RP Data subscription, you can add the report here to enhance your property evaluation with premium market data.
                </p>
                <p className="text-amber-600 text-sm italic">
                  RP Data provides comprehensive property history, comparable sales, and market insights.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed font-sans">
                  {property.rp_data_report}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Additional Report */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
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

          <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
            {!property.additional_report ? (
              <div className="text-center">
                <p className="font-semibold text-blue-800 mb-2">Add Additional Property Report</p>
                <p className="text-blue-700 text-sm mb-2">
                  Upload any additional property reports, valuations, or documents to enhance your property analysis.
                </p>
                <p className="text-blue-600 text-sm italic">
                  Supports PDF uploads or text paste for custom reports and data.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed font-sans">
                  {property.additional_report}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* AI-Generated Selling Pitch */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">AI-Generated Selling Pitch</h2>
            {property.pitch && !isEditingPitch && (
              <div className="flex gap-2">
                <button
                  onClick={startEditingPitch}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors text-sm"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button
                  onClick={generatePitch}
                  disabled={generatingPitch}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  {generatingPitch ? "..." : "Regenerate"}
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
                  className="w-full min-h-[200px] p-4 border-2 border-gray-200 rounded-xl text-gray-700 leading-relaxed resize-y focus:border-cyan-500 focus:outline-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={cancelEditingPitch}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedPitch}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-sky-50 to-emerald-50 p-5 rounded-xl border border-sky-100">
                <p className="text-gray-700 leading-relaxed">{property.pitch}</p>
              </div>
            )
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">Generate a professional, AI-powered selling pitch for this property.</p>
              <button
                onClick={generatePitch}
                disabled={generatingPitch}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
              >
                <Sparkles size={20} />
                {generatingPitch ? "Generating Pitch..." : "Generate Pitch"}
              </button>
            </div>
          )}
        </div>

        {/* Social Media Marketing */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Social Media Marketing</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Facebook Ad */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                <FacebookIcon />
                Facebook Ad
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Create a paid Facebook ad with optimized copy, headline, and call-to-action.
              </p>
              <button
                onClick={generateFacebookAd}
                disabled={generatingFbAd}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {generatingFbAd ? "Generating..." : "Generate Ad"}
              </button>
            </div>

            {/* Facebook Post */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                <Share2 size={20} className="text-emerald-600" />
                Facebook Post
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Create an engaging organic post with all property details and photos.
              </p>
              <button
                onClick={generateFacebookPost}
                disabled={generatingFbPost}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {generatingFbPost ? "Generating..." : "Generate Post"}
              </button>
            </div>
          </div>
        </div>
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

      {/* Mark as Sold Modal */}
      {showSoldModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-emerald-500 mb-2 flex items-center gap-2">
              <span className="text-2xl">💰</span>
              Mark Property as Sold
            </h2>
            <p className="text-gray-500 mb-6">
              Enter the sold price and sale date. This will add the sale to your property database for future analysis and trends.
            </p>

            {/* List Price (Original) */}
            <div className="mb-4">
              <label className="block font-semibold text-gray-900 mb-2">List Price (Original)</label>
              <div className="w-full p-3 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-700 font-medium">
                ${property?.price?.toLocaleString() || '0'}
              </div>
            </div>

            {/* Sold Price */}
            <div className="mb-4">
              <label className="block font-semibold text-gray-900 mb-2">Sold Price *</label>
              <input
                type="number"
                placeholder="e.g., 510000"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Sale Date */}
            <div className="mb-5">
              <label className="block font-semibold text-gray-900 mb-2">Sale Date *</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Difference from List Price */}
            {soldPrice && property?.price && parseFloat(soldPrice) > 0 && (
              <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                <div className="text-emerald-600 text-sm font-medium mb-1">Difference from List Price</div>
                <div className="text-emerald-600 text-2xl font-bold">
                  {(() => {
                    const diff = parseFloat(soldPrice) - property.price;
                    const percentage = ((diff / property.price) * 100).toFixed(1);
                    const sign = diff >= 0 ? '+' : '';
                    return `${sign}$${Math.abs(diff).toLocaleString()}(${sign}${percentage}%)`;
                  })()}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowSoldModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsSold}
                disabled={markingSold}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 border-2 border-emerald-600"
              >
                {markingSold ? "Saving..." : "Mark as Sold & Add to Database"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facebook Ad Modal */}
      {showFbAdModal && fbAdCopy && (
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
              <div className="bg-white px-3 pb-3 text-sm">{fbAdCopy.primary_text}</div>
              {property.images?.[0] && (
                <img src={property.images[0]} alt="Ad" className="w-full aspect-video object-cover" />
              )}
              <div className="bg-white p-3">
                <div className="font-semibold">{fbAdCopy.headline}</div>
                <div className="text-gray-500 text-sm">{fbAdCopy.description}</div>
                <button className="w-full mt-2 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold text-sm">
                  {fbAdCopy.call_to_action?.replace(/_/g, ' ')}
                </button>
              </div>
            </div>

            {/* Copy Buttons */}
            <div className="space-y-3 mb-5">
              {[
                { label: 'Headline', value: fbAdCopy.headline },
                { label: 'Primary Text', value: fbAdCopy.primary_text },
                { label: 'Description', value: fbAdCopy.description },
                { label: 'Call to Action', value: fbAdCopy.call_to_action }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{item.label}</div>
                  <div className="text-gray-800 pr-10">{item.value}</div>
                  <button
                    onClick={() => copyToClipboard(item.value, item.label)}
                    className="absolute top-4 right-4 p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Upload size={14} className="text-gray-500" />
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
      {showFbPostModal && fbPostContent && (
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
                {fbPostContent}
              </pre>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(fbPostContent, "Post")}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 transition-colors"
              >
                <Upload size={16} />
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
