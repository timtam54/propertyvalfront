"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";
import { Home, Bed, Bath, Car, Building, Edit, Trash2, Search, Upload, CheckCircle, Settings, User, X, LogOut, Menu, MapPin, List, Filter, Star, Download, Plus, TrendingUp, Clock, DollarSign } from "lucide-react";
import { API } from "@/lib/config";
import { PropertyQuickActions } from "@/components/PropertyActions";
import BatchExport from "@/components/BatchExport";
import PropertyEdit from "@/components/PropertyEdit";
import PropertyImageCarousel from "@/components/PropertyImageCarousel";
import DarkModeToggle from "@/components/DarkModeToggle";
import { useMsalSafe, useIsAuthenticatedSafe, useGoogleAuth } from "@/components/AuthProvider";
import { usePageView } from "@/hooks/useAudit";

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
  }
}

interface PropertyNote {
  id: string;
  text: string;
  created_at: string;
  created_by: string;
  type?: 'general' | 'call' | 'meeting' | 'offer' | 'follow_up';
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
  evaluation_report?: string | null;
  evaluation_date?: string;
  is_favourite?: boolean;
  notes?: PropertyNote[];
  neighbouring_suburb?: string;
  neighbouring_postcode?: string;
  neighbouring_state?: string;
  created_at?: string;
  comparables_data?: {
    statistics?: {
      price_range?: {
        min?: number;
        max?: number;
        avg?: number;
      };
    };
  };
}

// Helper function to calculate days since a date
function getDaysSince(dateString?: string): number | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function HomePage() {
  const router = useRouter();
  const { instance, accounts } = useMsalSafe();
  const isMsalAuthenticated = useIsAuthenticatedSafe();
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

  // All useState hooks must be declared before any conditional returns
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [showPropertyEdit, setShowPropertyEdit] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [showBatchExport, setShowBatchExport] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 12;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fetch user admin status
  useEffect(() => {
    const fetchUserAdmin = async () => {
      if (!isAuthenticated || !userEmail) {
        setIsAdmin(false);
        return;
      }
      try {
        const response = await fetch(`${API}/auth/users`);
        if (response.ok) {
          const data = await response.json();
          const currentUser = data.users?.find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase());
          // Handle both boolean true and bit field value 1
          setIsAdmin(currentUser?.admin === true || currentUser?.admin === 1);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Failed to fetch user admin status:', err);
        setIsAdmin(false);
      }
    };
    fetchUserAdmin();
  }, [isAuthenticated, userEmail]);

  // Poll for Google Maps to be loaded
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setGoogleLoaded(true);
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
        return true;
      }
      return false;
    };

    if (checkGoogleMaps()) return;

    interval = setInterval(() => {
      checkGoogleMaps();
    }, 100);

    timeout = setTimeout(() => {
      if (interval) clearInterval(interval);
    }, 10000);

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return properties.slice(startIndex, endIndex);
  }, [properties, currentPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Escape to blur inputs
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Don't trigger if modal is open
      if (showPropertyEdit || showBatchExport) {
        if (e.key === 'Escape') {
          setShowPropertyEdit(false);
          setShowBatchExport(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          // New property
          e.preventDefault();
          setEditingProperty(null);
          setShowPropertyEdit(true);
          break;
        case '/':
          // Focus search
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'escape':
          // Clear search
          if (searchQuery) {
            setSearchQuery('');
            applyFilters('', filters, showFavouritesOnly);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPropertyEdit, showBatchExport, searchQuery, filters, showFavouritesOnly]);

  // Apply all filters including search - must be before early return
  const applyFilters = useCallback((searchText: string, currentFilters: typeof filters, favouritesOnly: boolean = false) => {
    let filtered = [...allProperties];

    // Favourites filter
    if (favouritesOnly) {
      filtered = filtered.filter(prop => prop.is_favourite);
    }

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

    // Sort favourites first
    filtered.sort((a, b) => {
      if (a.is_favourite && !b.is_favourite) return -1;
      if (!a.is_favourite && b.is_favourite) return 1;
      return 0;
    });

    setProperties(filtered);
    setCurrentPage(1);
  }, [allProperties]);

  useEffect(() => {
    if (userEmail) {
      fetchProperties();
    }
  }, [userEmail]);

  // Initialize Google Map when view switches to map
  useEffect(() => {
    if (activeView === "map" && googleLoaded) {
      const timer = setTimeout(() => {
        if (mapContainerRef.current && !mapRef.current) {
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
      const timer = setTimeout(() => {
        if (!mapRef.current) return;

        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

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

                if (geocodedCount === properties.length && markersRef.current.length > 0) {
                  mapRef.current?.fitBounds(bounds);
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
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [activeView, properties, googleLoaded]);

  // Handle logout - defined before conditional return
  const handleLogout = () => {
    if (isGoogleAuthenticated) {
      googleLogout();
      router.push("/login");
    } else if (instance) {
      instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + "/login"
      });
    } else {
      router.push("/login");
    }
  };

  // Don't render page content until authenticated - AFTER all hooks
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (userEmail) {
        headers['x-user-email'] = userEmail;
      }
      const response = await fetch(`${API}/properties`, { headers });
      if (!response.ok) {
        console.error(`HTTP error fetching properties: ${response.status}`);
        return;
      }
      const data = await response.json();
      const activeProperties = data.filter((prop: Property) => prop.status !== "sold");
      setAllProperties(activeProperties);
      setProperties(activeProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, filters, showFavouritesOnly);
  };

  const handleFavouritesToggle = () => {
    const newValue = !showFavouritesOnly;
    setShowFavouritesOnly(newValue);
    applyFilters(searchQuery, filters, newValue);
  };

  const handleFavouriteChange = (propertyId: string, isFavourite: boolean) => {
    setAllProperties(prev => prev.map(p =>
      p.id === propertyId ? { ...p, is_favourite: isFavourite } : p
    ));
    setProperties(prev => prev.map(p =>
      p.id === propertyId ? { ...p, is_favourite: isFavourite } : p
    ));
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

  const handleAddProperty = () => {
    setEditingProperty(null);
    setShowPropertyEdit(true);
  };

  const handleEditProperty = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProperty(property);
    setShowPropertyEdit(true);
  };

  const handlePropertySaved = () => {
    fetchProperties();
  };

  const handleDelete = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this property?")) {
      return;
    }
    try {
      const response = await fetch(`${API}/properties/${propertyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      toast.success("Property deleted successfully!");
      fetchProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Google Maps Script */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={() => {
          setGoogleLoaded(true);
        }}
        onError={(e) => {
          console.error("Failed to load Google Maps API:", e);
        }}
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-gray-800 dark:to-gray-800 border-b border-cyan-700 dark:border-gray-700 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Home className="w-6 h-6 sm:w-7 sm:h-7 text-white dark:text-cyan-500" />
              <span className="text-base sm:text-xl font-bold text-white dark:text-cyan-500">PropertyPitch</span>
            </div>

            {/* Desktop Navigation Buttons */}
            <div className="hidden md:flex items-center gap-2">
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
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 dark:bg-gray-800 text-white dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-white/30 dark:hover:bg-gray-700 transition-all whitespace-nowrap"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </button>
              )}

              {/* Dark Mode Toggle */}
              <DarkModeToggle />

              {/* User Avatar & Menu - Desktop */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/20 dark:hover:bg-gray-700 transition-all"
                >
                  {userPicture ? (
                    <img src={userPicture} alt={userName} className="w-8 h-8 rounded-full object-cover ring-2 ring-white/50" />
                  ) : (
                    <div className="w-8 h-8 bg-white/20 dark:bg-gradient-to-br dark:from-cyan-500 dark:to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white/50">
                      {userInitials}
                    </div>
                  )}
                  <span className="hidden lg:block text-sm font-medium text-white dark:text-gray-200 max-w-[120px] truncate">
                    {userName}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/20 dark:hover:bg-gray-700 transition-all"
              >
                {userPicture ? (
                  <img src={userPicture} alt={userName} className="w-8 h-8 rounded-full object-cover ring-2 ring-white/50" />
                ) : (
                  <div className="w-8 h-8 bg-white/20 dark:bg-gradient-to-br dark:from-cyan-500 dark:to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white/50">
                    {userInitials}
                  </div>
                )}
              </button>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-gray-700 transition-all"
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6 text-white dark:text-gray-300" />
                ) : (
                  <Menu className="w-6 h-6 text-white dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-3 space-y-2">
              <div className="flex items-center justify-between px-4 py-2 mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Theme</span>
                <DarkModeToggle />
              </div>
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
              {isAdmin && (
                <button
                  onClick={() => { router.push('/admin'); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg"
                >
                  <Settings className="w-5 h-5" />
                  Admin
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* User Menu Dropdown - Mobile */}
      {showUserMenu && (
        <div className="md:hidden fixed left-4 right-4 top-[72px] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}

      {/* Click outside to close menus */}
      {(showUserMenu || showMobileMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowUserMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Search Bar and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8 p-3 sm:p-4 transition-colors">
          {/* Search Input and Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search Input - Full width on mobile */}
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Action Buttons - Side by side on mobile */}
            <div className="flex gap-2">
              {/* Batch Export */}
              <button
                onClick={() => setShowBatchExport(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all text-sm sm:text-base"
                title="Export multiple PDFs"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">Export</span>
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Filters Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  showFilters || activeFilterCount > 0
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">Filter</span>
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-white text-cyan-600 text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {/* Property Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Property Type</label>
                  <select
                    value={filters.propertyType}
                    onChange={(e) => handleFilterChange("propertyType", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">All Types</option>
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

                {/* Min Price */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Min Price</label>
                  <input
                    type="number"
                    placeholder="$0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Max Price</label>
                  <input
                    type="number"
                    placeholder="No max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Min Beds */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Min Beds</label>
                  <select
                    value={filters.minBeds}
                    onChange={(e) => handleFilterChange("minBeds", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Max Beds</label>
                  <select
                    value={filters.maxBeds}
                    onChange={(e) => handleFilterChange("maxBeds", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Min Baths</label>
                  <select
                    value={filters.minBaths}
                    onChange={(e) => handleFilterChange("minBaths", e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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

        {/* Properties List */}
        <div>
          {/* Header with Title, View Tabs, and Add Button */}
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            {/* Title */}
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              Properties
              <span className="ml-1 sm:ml-2 text-sm sm:text-base font-normal text-gray-500 dark:text-gray-400">
                ({properties.length})
              </span>
            </h2>

            {/* View Tabs and Add Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* View Tabs */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveView("list")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                    activeView === "list"
                      ? "bg-white dark:bg-gray-600 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setActiveView("map")}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                    activeView === "map"
                      ? "bg-white dark:bg-gray-600 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Map</span>
                </button>
              </div>

              {/* Add Property Button */}
              <button
                onClick={handleAddProperty}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Add Property</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 sm:p-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">Loading properties...</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Please wait while we fetch your properties</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 sm:p-16 text-center">
              <div className="text-4xl sm:text-6xl mb-4">🏠</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">No properties yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6">Click the Add Property button to get started</p>
              <button
                onClick={handleAddProperty}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                Add Your First Property
              </button>
            </div>
          ) : activeView === "map" ? (
            /* Map View */
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative">
              {!googleLoaded ? (
                <div className="w-full h-[500px] sm:h-[600px] flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mx-auto mb-3"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading Google Maps...</p>
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
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => router.push(`/property/${property.id}`)}
                  >
                    {/* Image Carousel with Quick Preview */}
                    <div className="relative">
                      <PropertyImageCarousel
                        images={property.images || []}
                        alt={property.location}
                      />

                      {/* Quick Actions Overlay */}
                      <div className="absolute top-2 right-2 z-10">
                        <PropertyQuickActions
                          propertyId={property.id}
                          isFavourite={property.is_favourite}
                          notesCount={property.notes?.length || 0}
                          onFavouriteChange={(isFav) => handleFavouriteChange(property.id, isFav)}
                        />
                      </div>

                      {/* Quick Stats Preview - Shows on Hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                          <div className="flex flex-wrap gap-2 text-white text-xs sm:text-sm">
                            {/* Days Listed */}
                            {property.created_at && (
                              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" />
                                <span>{getDaysSince(property.created_at)} days</span>
                              </div>
                            )}

                            {/* Valuation from comparables */}
                            {property.comparables_data?.statistics?.price_range?.avg && (
                              <div className="flex items-center gap-1 bg-emerald-500/80 backdrop-blur-sm px-2 py-1 rounded-full">
                                <TrendingUp className="w-3 h-3" />
                                <span>${(property.comparables_data.statistics.price_range.avg / 1000).toFixed(0)}k avg</span>
                              </div>
                            )}

                            {/* Evaluation Status */}
                            {property.evaluation_report ? (
                              <div className="flex items-center gap-1 bg-emerald-500/80 backdrop-blur-sm px-2 py-1 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                <span>Evaluated</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-amber-500/80 backdrop-blur-sm px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" />
                                <span>Pending</span>
                              </div>
                            )}

                            {/* Property Type */}
                            {property.property_type && (
                              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                                <Building className="w-3 h-3" />
                                <span>{property.property_type}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 line-clamp-2">
                        {property.location}
                      </h3>

                      {property.user_email && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                          <User className="w-3 h-3" />
                          <span className="truncate">{property.user_email}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 sm:gap-4 text-gray-600 dark:text-gray-300 mb-3 sm:mb-4">
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-xs sm:text-sm">{property.beds}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-xs sm:text-sm">{property.baths}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="w-4 h-4 text-gray-400 dark:text-gray-500" />
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
                          onClick={(e) => handleEditProperty(property, e)}
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
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base order-first sm:order-none">
                    Page {currentPage} of {Math.ceil(properties.length / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(properties.length / ITEMS_PER_PAGE)))}
                    disabled={currentPage === Math.ceil(properties.length / ITEMS_PER_PAGE)}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors ${
                      currentPage === Math.ceil(properties.length / ITEMS_PER_PAGE)
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
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

      {/* Property Edit Modal */}
      <PropertyEdit
        property={editingProperty}
        userEmail={userEmail}
        onSave={handlePropertySaved}
        onClose={() => {
          setShowPropertyEdit(false);
          setEditingProperty(null);
        }}
        isOpen={showPropertyEdit}
      />

      {/* Batch Export Modal */}
      {showBatchExport && (
        <BatchExport
          properties={properties}
          onClose={() => setShowBatchExport(false)}
        />
      )}
    </div>
  );
}
