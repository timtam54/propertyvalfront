"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { API } from "@/lib/config";
import { useUserEmail } from "@/components/AuthProvider";
import { usePageView } from "@/hooks/useAudit";

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
}

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const userEmail = useUserEmail();

  // Track page view for audit with property ID
  usePageView('property-edit', propertyId ? parseInt(propertyId, 10) || 0 : 0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const response = await axios.get(`${API}/properties/${propertyId}`);
      const property: Property = response.data;

      setFormData({
        location: property.location || "",
        beds: property.beds?.toString() || "",
        baths: property.baths?.toString() || "",
        carpark: property.carpark?.toString() || "",
        price: property.price?.toString() || "",
        property_type: property.property_type || "",
        size: property.size?.toString() || "",
        features: property.features || "",
      });
    } catch (error: any) {
      console.error("Error fetching property:", error);
      const message = error.response?.data?.detail || "Failed to load property";
      toast.error(message);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        beds: parseInt(formData.beds) || 0,
        baths: parseInt(formData.baths) || 0,
        carpark: parseInt(formData.carpark) || 0,
        price: formData.price ? parseFloat(formData.price) : null,
        size: formData.size ? parseFloat(formData.size) : null,
        user_email: userEmail,
      };

      await axios.put(`${API}/properties/${propertyId}`, payload);
      toast.success("Property updated successfully!");
      router.push("/");
    } catch (error: any) {
      console.error("Error updating property:", error);
      const message = error.response?.data?.detail || "Failed to update property";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <header className="header">
          <div className="header-content">
            <Home className="text-sky-500" size={32} />
            <h1 className="logo">EstatePro</h1>
          </div>
        </header>
        <main className="main-content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <Loader2 className="animate-spin text-sky-500" size={48} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
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
          <h2 className="form-title">Edit Property</h2>
          <p className="form-subtitle">
            Update property details
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
                  value={formData.location}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., 123 Main St, Sydney NSW"
                  required
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
              <button type="submit" className="submit-btn" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
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
        </div>
      </main>
    </div>
  );
}
