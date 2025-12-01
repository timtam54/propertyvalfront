"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Home } from "lucide-react";
import { API } from "@/lib/config";
import { useUserEmail } from "@/components/AuthProvider";
import Script from "next/script";
import { usePageView } from "@/hooks/useAudit";

export default function AddPropertyPage() {
  const router = useRouter();
  const userEmail = useUserEmail();
  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Track page view for audit
  usePageView('property-new');
  const [formData, setFormData] = useState({
    location: "",
    beds: "",
    baths: "",
    carpark: "",
    price: "",
    property_type: "",
    size: "",
    features: "",
  });

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (googleLoaded && locationInputRef.current && !autocompleteRef.current) {
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
          setFormData(prev => ({ ...prev, location: place.formatted_address || '' }));
        }
      });

      autocompleteRef.current = autocomplete;
    }
  }, [googleLoaded]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        user_email: userEmail,
      };
      const response = await axios.post(`${API}/properties`, payload);
      toast.success("Property added successfully!");
      router.push("/");
    } catch (error: any) {
      console.error("Error adding property:", error);
      const message = error.response?.data?.detail || "Failed to add property. Make sure the backend is running.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Google Maps Script */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={() => setGoogleLoaded(true)}
        strategy="afterInteractive"
      />
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <Home className="text-sky-500" size={32} />
          <h1 className="logo">EstatePro</h1>
        </div>
      </header>

      <main className="main-content">
        <button onClick={() => router.push("/")} className="back-btn">
          <ArrowLeft size={20} />
          Back to Properties
        </button>

        <div className="property-form-container">
          <h2 className="form-title">Add New Property</h2>
          <p className="form-subtitle">
            Enter property details to create a new listing
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="location">
                  Location *
                </label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  ref={locationInputRef}
                  value={formData.location}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Start typing an address..."
                  required
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="property_type">
                  Property Type *
                </label>
                <select
                  id="property_type"
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Select type</option>
                  <option value="House">House</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Villa">Villa</option>
                  <option value="Land">Land</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="beds">
                  Bedrooms *
                </label>
                <input
                  id="beds"
                  type="number"
                  name="beds"
                  value={formData.beds}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 3"
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="baths">
                  Bathrooms *
                </label>
                <input
                  id="baths"
                  type="number"
                  name="baths"
                  value={formData.baths}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 2"
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="carpark">
                  Car Spaces *
                </label>
                <input
                  id="carpark"
                  type="number"
                  name="carpark"
                  value={formData.carpark}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 2"
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="price">
                  Price
                </label>
                <input
                  id="price"
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 850000"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="size">
                  Size (sqm)
                </label>
                <input
                  id="size"
                  type="number"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 250"
                  min="0"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1.5rem" }}>
              <label className="form-label" htmlFor="features">
                Features
              </label>
              <textarea
                id="features"
                name="features"
                value={formData.features}
                onChange={handleChange}
                className="form-textarea"
                placeholder="e.g., Swimming pool, modern kitchen, air conditioning..."
                rows={4}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "2rem",
              }}
            >
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Adding Property..." : "Add Property"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>

          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              background: "#f0f9ff",
              borderRadius: "12px",
              border: "1px solid #bae6fd",
            }}
          >
            <p style={{ fontSize: "0.875rem", color: "#0369a1" }}>
              💡 <strong>Note:</strong> The backend must be running to add properties.
              See the README for setup instructions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
