"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import axios from "axios";
import { toast } from "sonner";
import { Home, Bed, Bath, Car, Building, Edit, Trash2, DollarSign, Search, Upload, CheckCircle, Settings, User, FileText, X, LogOut, Menu, MapPin, List, Filter, ChevronDown } from "lucide-react";
import { API } from "@/lib/config";
import ReportUploadModal from "@/components/ReportUploadModal";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useGoogleAuth } from "@/components/AuthProvider";
import { usePageView } from "@/hooks/useAudit";

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
  }
}

interface Property {
  id: string;
  location: string;
  beds: number;
  baths: number;
  carpark: number;
  price: number | null;
  pricing_type?: string;
  price_upper?: number;
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
  status?: string;
  rp_data_report?: string;
  additional_report?: string;
  user_email?: string;
}

interface MarketingPackage {
  id: string;
  name: string;
  price: number;
  description?: string;
  inclusions?: Array<{ text: string; price?: number } | string>;
}

export default function HomePage() {
  const router = useRouter();
  const { instance, accounts } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const { googleUser, isGoogleAuthenticated, googleLogout } = useGoogleAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);

  // Check if user is authenticated via either provider
  const isAuthenticated = isMsalAuthenticated || isGoogleAuthenticated;

  // Track page view for audit
  usePageView('home');

  // Get current user info (from Microsoft or Google)
  const msalUser = accounts[0];
  const userName = googleUser?.name || msalUser?.name || msalUser?.username || "User";
  const userEmail = googleUser?.email || msalUser?.username || "";
  const userPicture = googleUser?.picture;
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Handle logout
  const handleLogout = () => {
    if (isGoogleAuthenticated) {
      googleLogout();
      router.push("/login");
    } else {
      instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + "/login"
      });
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  // View and filter states
  const [activeView, setActiveView] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    propertyType: "",
    minPrice: "",
    maxPrice: "",
    minBeds: "",
    maxBeds: "",
    minBaths: "",
  });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Poll for Google Maps to be loaded (since Script onLoad has closure issues)
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        console.log("Google Maps detected via polling");
        setGoogleLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkGoogleMaps()) return;

    // Poll every 100ms for up to 10 seconds
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.error("Google Maps failed to load after 10 seconds");
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const ITEMS_PER_PAGE = 12;
  const [marketingPackages, setMarketingPackages] = useState<MarketingPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [showRpDataModal, setShowRpDataModal] = useState(false);
  const [showAdditionalReportModal, setShowAdditionalReportModal] = useState(false);
  const [rpDataText, setRpDataText] = useState("");
  const [additionalReportText, setAdditionalReportText] = useState("");
  const [uploadingRpData, setUploadingRpData] = useState(false);
  const [uploadingAdditionalReport, setUploadingAdditionalReport] = useState(false);

  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return properties.slice(startIndex, endIndex);
  }, [properties, currentPage]);

  useEffect(() => {
    if (userEmail) {
      fetchProperties();
    }
    loadAgentSettings();
    loadMarketingPackages();
  }, [userEmail]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (googleLoaded && locationInputRef.current && !autocompleteRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'au' }, // Restrict to Australia
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          const address = place.formatted_address;
          setFormData((prev) => ({
            ...prev,
            location: address,
          }));
        }
      });

      autocompleteRef.current = autocomplete;
    }
  }, [googleLoaded]);

  const loadMarketingPackages = async () => {
    try {
      const response = await axios.get(`${API}/marketing-packages`);
      if (response.data.success) {
        setMarketingPackages(response.data.packages || []);
      }
    } catch (error) {
      console.error("Error loading marketing packages:", error);
    }
  };

  const loadAgentSettings = async () => {
    try {
      const response = await axios.get(`${API}/agent-settings`);
      if (response.data && response.data.settings) {
        const settings = response.data.settings;
        setFormData((prev) => ({
          ...prev,
          agent1_name: settings.agent1_name || "",
          agent1_phone: settings.agent1_phone || "",
          agent2_name: settings.agent2_name || "",
          agent2_phone: settings.agent2_phone || "",
          agent_email: settings.agent_email || "",
        }));
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
      await axios.post(`${API}/agent-settings`, settings);
      toast.success("Agent contact details saved!");
    } catch (error) {
      console.error("Error saving agent settings:", error);
      toast.error("Failed to save agent settings");
    }
  };

  const handleExportProperties = async () => {
    try {
      toast.info("Exporting properties to CSV...");
      const response = await axios.get(`${API}/properties/export/csv`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `properties_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Properties exported successfully!");
    } catch (error) {
      console.error("Error exporting properties:", error);
      toast.error("Failed to export properties");
    }
  };

  const fetchProperties = async () => {
    setLoading(true);
    try {
      // Send user email header for user-specific filtering
      const headers: Record<string, string> = {};
      if (userEmail) {
        headers['x-user-email'] = userEmail;
      }
      const response = await axios.get(`${API}/properties`, { headers });
      const activeProperties = response.data.filter((prop: Property) => prop.status !== "sold");
      setAllProperties(activeProperties);
      setProperties(activeProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters including search
  const applyFilters = useCallback((searchText: string, currentFilters: typeof filters) => {
    let filtered = [...allProperties];

    // Text search
    if (searchText.trim()) {
      filtered = filtered.filter(prop =>
        prop.location?.toLowerCase().includes(searchText.toLowerCase()) ||
        prop.property_type?.toLowerCase().includes(searchText.toLowerCase()) ||
        prop.features?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Property type filter
    if (currentFilters.propertyType) {
      filtered = filtered.filter(prop => prop.property_type === currentFilters.propertyType);
    }

    // Price filters
    if (currentFilters.minPrice) {
      const minPrice = parseFloat(currentFilters.minPrice);
      filtered = filtered.filter(prop => prop.price && prop.price >= minPrice);
    }
    if (currentFilters.maxPrice) {
      const maxPrice = parseFloat(currentFilters.maxPrice);
      filtered = filtered.filter(prop => prop.price && prop.price <= maxPrice);
    }

    // Beds filters
    if (currentFilters.minBeds) {
      const minBeds = parseInt(currentFilters.minBeds);
      filtered = filtered.filter(prop => prop.beds >= minBeds);
    }
    if (currentFilters.maxBeds) {
      const maxBeds = parseInt(currentFilters.maxBeds);
      filtered = filtered.filter(prop => prop.beds <= maxBeds);
    }

    // Baths filter
    if (currentFilters.minBaths) {
      const minBaths = parseInt(currentFilters.minBaths);
      filtered = filtered.filter(prop => prop.baths >= minBaths);
    }

    setProperties(filtered);
    setCurrentPage(1);
  }, [allProperties]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, filters);
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(searchQuery, newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      propertyType: "",
      minPrice: "",
      maxPrice: "",
      minBeds: "",
      maxBeds: "",
      minBaths: "",
    };
    setFilters(clearedFilters);
    setSearchQuery("");
    applyFilters("", clearedFilters);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  // Initialize Google Map when view switches to map
  useEffect(() => {
    // Add a small delay to ensure the DOM element is rendered
    if (activeView === "map" && googleLoaded) {
      const timer = setTimeout(() => {
        if (mapContainerRef.current && !mapRef.current) {
          // Default to Sydney, Australia
          const defaultCenter = { lat: -33.8688, lng: 151.2093 };

          mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: 10,
            styles: [
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
            ]
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeView, googleLoaded]);

  // Update markers when properties change or view switches to map
  useEffect(() => {
    if (activeView === "map" && googleLoaded && properties.length > 0) {
      // Wait for map to be initialized
      const timer = setTimeout(() => {
        if (!mapRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Geocode and add markers for each property
        const geocoder = new window.google.maps.Geocoder();
        const bounds = new window.google.maps.LatLngBounds();
        let geocodedCount = 0;

        properties.forEach((property) => {
          if (property.location) {
            geocoder.geocode({ address: property.location }, (results, status) => {
              geocodedCount++;

              if (status === "OK" && results && results[0]) {
                const position = results[0].geometry.location;
                bounds.extend(position);

                const marker = new window.google.maps.Marker({
                  position,
                  map: mapRef.current,
                  title: property.location,
                  icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#06b6d4",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                  }
                });

                // Info window with property details
                const infoWindow = new window.google.maps.InfoWindow({
                  content: `
                    <div style="padding: 8px; max-width: 250px;">
                      <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${property.location}</h3>
                      <p style="color: #666; margin-bottom: 4px; font-size: 12px;">
                        ${property.beds} bed • ${property.baths} bath • ${property.carpark} car
                      </p>
                      ${property.price ? `<p style="color: #06b6d4; font-weight: bold; font-size: 14px;">$${property.price.toLocaleString()}</p>` : ''}
                      <a href="/property/${property.id}" style="color: #06b6d4; font-size: 12px; text-decoration: underline;">View Details →</a>
                    </div>
                  `
                });

                marker.addListener("click", () => {
                  infoWindow.open(mapRef.current, marker);
                });

                markersRef.current.push(marker);

                // Fit bounds once all properties have been geocoded
                if (geocodedCount === properties.length && markersRef.current.length > 0) {
                  mapRef.current?.fitBounds(bounds);
                  // Don't zoom in too much for single marker
                  const listener = window.google.maps.event.addListener(mapRef.current!, "idle", () => {
                    if (mapRef.current!.getZoom()! > 15) {
                      mapRef.current!.setZoom(15);
                    }
                    window.google.maps.event.removeListener(listener);
                  });
                }
              }
            });
          }
        });
      }, 200); // Wait for map to be initialized

      return () => clearTimeout(timer);
    }
  }, [activeView, properties, googleLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = formData.images.length + files.length;
    if (totalImages > 25) {
      toast.error("Maximum 25 images allowed");
      return;
    }

    try {
      const loadingToast = toast.loading(`Processing ${files.length} image(s)...`);
      const newImages: string[] = [];

      for (const file of files) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push(base64);
      }

      toast.dismiss(loadingToast);
      toast.success(`${files.length} image(s) added`);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error('Failed to process images');
    }
  };

  const removeImage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.beds || !formData.baths || !formData.carpark || !formData.location) {
      toast.error("Please fill in all required fields");
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
      };

      if (editingId) {
        await axios.put(`${API}/properties/${editingId}`, payload);
        toast.success("Property updated successfully!");
        setEditingId(null);
      } else {
        await axios.post(`${API}/properties`, payload);
        toast.success("Property added successfully!");
      }

      const agentDetails = {
        agent1_name: formData.agent1_name,
        agent1_phone: formData.agent1_phone,
        agent2_name: formData.agent2_name,
        agent2_phone: formData.agent2_phone,
        agent_email: formData.agent_email,
      };

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
        ...agentDetails,
      });

      // Reset RP Data and Additional Report fields
      setRpDataText("");
      setAdditionalReportText("");

      fetchProperties();
    } catch (error: any) {
      console.error("Error saving property:", error);
      toast.error(error.response?.data?.detail || "Failed to save property");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingId(property.id);
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
    });
    // Load RP Data and Additional Report from property
    setRpDataText(property.rp_data_report || "");
    setAdditionalReportText(property.additional_report || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    loadAgentSettings();
    setFormData((prev) => ({
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
      agent1_name: prev.agent1_name,
      agent1_phone: prev.agent1_phone,
      agent2_name: prev.agent2_name,
      agent2_phone: prev.agent2_phone,
      agent_email: prev.agent_email,
    }));
    // Reset RP Data and Additional Report fields
    setRpDataText("");
    setAdditionalReportText("");
  };

  const handleDelete = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this property?")) {
      return;
    }
    try {
      await axios.delete(`${API}/properties/${propertyId}`);
      toast.success("Property deleted successfully!");
      fetchProperties();
      if (editingId === propertyId) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    }
  };

  // Extract text from PDF file using backend endpoint
  const extractTextFromPdf = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API}/properties/extract-pdf-text`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (!response.data.success || !response.data.text) {
      throw new Error('Failed to extract text from PDF');
    }

    return response.data.text;
  };

  // Handle RP Data upload/save
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
      toast.error(error.response?.data?.detail || "Failed to extract text from PDF. Please try pasting the text instead.");
    } finally {
      setUploadingRpData(false);
    }
  };

  // Handle Additional Report upload/save
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
      toast.error(error.response?.data?.detail || "Failed to extract text from PDF. Please try pasting the text instead.");
    } finally {
      setUploadingAdditionalReport(false);
    }
  };

  // Style constants for inputs
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    color: '#111827',
    fontSize: '14px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
  };

  // Keep Tailwind classes as backup
  const inputClass = "w-full bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all";
  const labelClass = "block text-sm font-semibold text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Google Maps Script */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Google Maps API loaded successfully");
          setGoogleLoaded(true);
        }}
        onError={(e) => {
          console.error("Failed to load Google Maps API:", e);
        }}
      />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Home className="w-7 h-7 text-cyan-500" />
              <span className="text-xl font-bold text-cyan-500">PropertyPitch</span>
            </div>

            {/* Desktop Navigation Buttons - hidden on mobile */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => router.push('/quick-evaluation')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-sm font-semibold rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-sm whitespace-nowrap"
              >
                <DollarSign className="w-4 h-4" />
                Quick Evaluation
              </button>
              <button
                onClick={() => router.push('/portfolio-import')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-orange-500 hover:to-orange-600 transition-all shadow-sm whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => router.push('/sold-properties')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4" />
                Sold
              </button>
              <button
                onClick={() => router.push('/data-management')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm whitespace-nowrap"
              >
                <Building className="w-4 h-4" />
                Database
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-all whitespace-nowrap"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* User Avatar & Menu - Desktop */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-all"
                >
                  {userPicture ? (
                    <img src={userPicture} alt={userName} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {userInitials}
                    </div>
                  )}
                  <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {userName}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{userName}</p>
                      <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: User Avatar + Hamburger Menu */}
            <div className="flex md:hidden items-center gap-2">
              {/* User Avatar - Mobile */}
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-all"
              >
                {userPicture ? (
                  <img src={userPicture} alt={userName} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {userInitials}
                  </div>
                )}
              </button>

              {/* Hamburger Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 py-3 space-y-2">
              <button
                onClick={() => { router.push('/quick-evaluation'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-lg"
              >
                <DollarSign className="w-5 h-5" />
                Quick Evaluation
              </button>
              <button
                onClick={() => { router.push('/portfolio-import'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-lg"
              >
                <Upload className="w-5 h-5" />
                Import Portfolio
              </button>
              <button
                onClick={() => { router.push('/sold-properties'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg"
              >
                <CheckCircle className="w-5 h-5" />
                Sold Properties
              </button>
              <button
                onClick={() => { router.push('/data-management'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg"
              >
                <Building className="w-5 h-5" />
                Database
              </button>
              <button
                onClick={() => { router.push('/settings'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </div>
          )}
        </div>
      </header>

      {/* User Menu Dropdown - Mobile (positioned below header) */}
      {showUserMenu && (
        <div className="md:hidden fixed left-4 right-4 top-[72px] bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}

      {/* Click outside to close menus */}
      {(showUserMenu || showMobileMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Search Bar and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8 p-4">
          {/* Search Input */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties by location, type, or features..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-cyan-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-cyan-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Property Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Property Type</label>
                  <select
                    value={filters.propertyType}
                    onChange={(e) => handleFilterChange("propertyType", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">All Types</option>
                    <option value="House">House</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Condo">Condo</option>
                  </select>
                </div>

                {/* Min Price */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Min Price</label>
                  <input
                    type="number"
                    placeholder="$0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Max Price</label>
                  <input
                    type="number"
                    placeholder="No max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Min Beds */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Min Beds</label>
                  <select
                    value={filters.minBeds}
                    onChange={(e) => handleFilterChange("minBeds", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                </div>

                {/* Max Beds */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Max Beds</label>
                  <select
                    value={filters.maxBeds}
                    onChange={(e) => handleFilterChange("maxBeds", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Any</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5+</option>
                  </select>
                </div>

                {/* Min Baths */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Min Baths</label>
                  <select
                    value={filters.minBaths}
                    onChange={(e) => handleFilterChange("minBaths", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {activeFilterCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-500 hover:text-red-600 font-semibold"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Property Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {editingId ? "Edit Property" : "List Your Property"}
          </h2>
          <p className="text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base">
            {editingId ? "Update property details" : "Add property details and generate an AI-powered selling pitch"}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Property Details Grid - responsive: 1 col mobile, 2 col tablet, 4 col desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
                <label style={labelStyle}>Size (sqm)</label>
                <input
                  type="number"
                  name="size"
                  value={formData.size}
                  onChange={handleInputChange}
                  style={inputStyle}
                  placeholder="e.g., 250"
                  min="0"
                />
              </div>

              <div>
                <label style={labelStyle}>Property Type</label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleInputChange}
                  style={inputStyle}
                >
                  <option value="">Select type</option>
                  <option value="House">House</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Condo">Condo</option>
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

            {/* Marketing Package */}
            {marketingPackages.length > 0 && (
              <div className="mb-6">
                <label className={labelClass}>Marketing Package (Optional)</label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className={inputClass}
                >
                  <option value="">No marketing package</option>
                  {marketingPackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - ${pkg.price.toLocaleString()} {pkg.description && `(${pkg.description})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Location with Google Places Autocomplete */}
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

            {/* Additional Features */}
            <div className="mb-8">
              <label className={labelClass}>Additional Features</label>
              <textarea
                name="features"
                value={formData.features}
                onChange={handleInputChange}
                className={`${inputClass} min-h-[120px] resize-y`}
                placeholder="e.g., Swimming pool, garden, modern kitchen, solar panels..."
              />
            </div>

            {/* Agent Contact Section */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Agent Contact Information</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Fill in and save your contact details - they&apos;ll auto-fill for all future properties
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveAgentSettings}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm w-full sm:w-auto"
                >
                  <User className="w-4 h-4" />
                  Save Contacts
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Agent 1 */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 sm:p-6 border border-cyan-200">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-cyan-600" />
                    <h4 className="font-semibold text-cyan-700">Agent 1</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input
                        type="text"
                        name="agent1_name"
                        value={formData.agent1_name}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="e.g., John Smith"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input
                        type="tel"
                        name="agent1_phone"
                        value={formData.agent1_phone}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="e.g., (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>

                {/* Agent 2 */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 sm:p-6 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-semibold text-emerald-700">Agent 2</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input
                        type="text"
                        name="agent2_name"
                        value={formData.agent2_name}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="e.g., Jane Doe"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input
                        type="tel"
                        name="agent2_phone"
                        value={formData.agent2_phone}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder="e.g., (555) 987-6543"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Image Upload */}
            <div className="mb-8">
              <label className={labelClass}>Property Images (up to 25)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 transition-all cursor-pointer"
              />

              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 mt-4">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RP Data Report Section */}
            <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #fbbf24', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#78350f', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} />
                  RP Data Report
                </h2>
                {!rpDataText ? (
                  <button type="button" onClick={() => setShowRpDataModal(true)} style={{ background: '#f59e0b', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.85rem', width: '100%' }}>
                    <DollarSign size={16} />
                    Add RP Data
                  </button>
                ) : (
                  <button type="button" onClick={() => setRpDataText('')} style={{ background: '#ef4444', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                    Remove
                  </button>
                )}
              </div>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: rpDataText ? 'left' : 'center' }}>
                {!rpDataText ? (
                  <>
                    <p style={{ color: '#78350f', fontWeight: 600, marginBottom: '0.5rem' }}>Have personal access to RP Data?</p>
                    <p style={{ color: '#92400e', fontSize: '0.9rem', marginBottom: '0' }}>If you have a personal RP Data subscription, you can add the report here to enhance your property evaluation with premium market data.</p>
                    <p style={{ color: '#92400e', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.5rem' }}>RP Data provides comprehensive property history, comparable sales, and market insights.</p>
                  </>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', color: '#0f172a', lineHeight: 1.8, fontSize: '0.9rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {rpDataText}
                  </div>
                )}
              </div>
            </div>

            {/* Additional Report Section */}
            <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', border: '2px solid #60a5fa', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} />
                  Additional Report
                </h2>
                <button type="button" onClick={() => setShowAdditionalReportModal(true)} style={{ background: '#3b82f6', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.85rem', width: '100%' }}>
                  <DollarSign size={16} />
                  Add Report
                </button>
              </div>

              <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', textAlign: additionalReportText ? 'left' : 'center' }}>
                {!additionalReportText ? (
                  <>
                    <p style={{ color: '#1e40af', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Add Additional Property Report</p>
                    <p style={{ color: '#3b82f6', fontSize: '0.85rem' }}>Upload any additional property reports, valuations, or documents to enhance your property analysis.</p>
                    <p style={{ color: '#3b82f6', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.5rem' }}>Supports PDF uploads or text paste for custom reports and data.</p>
                  </>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', color: '#0f172a', lineHeight: 1.8, fontSize: '0.85rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {additionalReportText}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold text-base sm:text-lg rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (editingId ? "Updating..." : "Adding Property...") : (editingId ? "Update Property" : "Add Property")}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-base sm:text-lg rounded-xl transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Properties List */}
        <div>
          {/* Header with Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Your Properties
              <span className="ml-2 text-base font-normal text-gray-500">
                ({properties.length} {properties.length === 1 ? "property" : "properties"})
              </span>
            </h2>

            {/* View Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView("list")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  activeView === "list"
                    ? "bg-white text-cyan-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setActiveView("map")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  activeView === "map"
                    ? "bg-white text-cyan-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <MapPin className="w-4 h-4" />
                Map
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Loading properties...</h3>
              <p className="text-gray-500 text-sm sm:text-base">Please wait while we fetch your properties</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-16 text-center">
              <div className="text-4xl sm:text-6xl mb-4">🏠</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No properties yet</h3>
              <p className="text-gray-500 text-sm sm:text-base">Add your first property above to get started</p>
            </div>
          ) : activeView === "map" ? (
            /* Map View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
              {!googleLoaded ? (
                <div className="w-full h-[500px] sm:h-[600px] flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-3"></div>
                    <p className="text-gray-500">Loading Google Maps...</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={mapContainerRef}
                  className="w-full h-[500px] sm:h-[600px]"
                />
              )}
            </div>
          ) : (
            /* List View */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {paginatedProperties.map((property) => (
                  <div
                    key={property.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => router.push(`/property/${property.id}`)}
                  >
                    {property.images && property.images.length > 0 ? (
                      <img
                        src={property.images[0]}
                        alt={property.location}
                        className="w-full h-40 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-40 sm:h-56 flex items-center justify-center bg-gray-100">
                        <Building className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300" />
                      </div>
                    )}

                    <div className="p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-2">
                        {property.location}
                      </h3>

                      {property.user_email && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2 sm:mb-3">
                          <User className="w-3 h-3" />
                          <span className="truncate">{property.user_email}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 sm:gap-4 text-gray-600 mb-3 sm:mb-4">
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4 text-gray-400" />
                          <span className="text-xs sm:text-sm">{property.beds}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4 text-gray-400" />
                          <span className="text-xs sm:text-sm">{property.baths}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="w-4 h-4 text-gray-400" />
                          <span className="text-xs sm:text-sm">{property.carpark}</span>
                        </div>
                      </div>

                      {property.price && (
                        <div className="text-lg sm:text-xl font-bold text-cyan-600 mb-3 sm:mb-4">
                          ${property.price.toLocaleString()}
                        </div>
                      )}

                      <div className="flex gap-2 sm:gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(property);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-4 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDelete(property.id, e)}
                          className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {properties.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-6 sm:mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-gray-600 font-medium text-sm sm:text-base order-first sm:order-none">
                    Page {currentPage} of {Math.ceil(properties.length / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(properties.length / ITEMS_PER_PAGE)))}
                    disabled={currentPage === Math.ceil(properties.length / ITEMS_PER_PAGE)}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
                      currentPage === Math.ceil(properties.length / ITEMS_PER_PAGE)
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

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
    </div>
  );
}
