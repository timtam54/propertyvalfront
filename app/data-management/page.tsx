"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Upload, Database, Search, TrendingUp, ArrowLeft } from "lucide-react";
import { API } from "@/lib/config";
import { usePageView } from "@/hooks/useAudit";

interface DbStats {
  total_sales: number;
  by_state?: Record<string, number>;
  postcodes_by_state?: Record<string, number>;
  date_range?: {
    oldest: string;
    newest: string;
  };
  success?: boolean;
}

interface PostcodeInfo {
  postcode: string;
  suburb: string;
  count: number;
  avg_price: number;
}

interface SaleRecord {
  address: string;
  suburb: string;
  property_type?: string;
  list_price?: number;
  sale_price: number;
  sale_date: string;
  beds?: number;
  baths?: number;
}

export default function DataManagement() {
  const router = useRouter();

  // Track page view for audit
  usePageView('data-management');

  const [activeTab, setActiveTab] = useState("import");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedState, setSelectedState] = useState("NSW");
  const [importing, setImporting] = useState(false);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [searchResults, setSearchResults] = useState<SaleRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [postcodes, setPostcodes] = useState<PostcodeInfo[]>([]);
  const [loadingPostcodes, setLoadingPostcodes] = useState(false);
  const [selectedPostcode, setSelectedPostcode] = useState("");

  const [searchFilters, setSearchFilters] = useState({
    suburb: "",
    state: "NSW",
    property_type: "",
    min_price: "",
    max_price: "",
    from_date: "2008-01-01",
    to_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  useEffect(() => {
    if (activeTab === "browse" && searchFilters.state) {
      fetchPostcodes(searchFilters.state);
    }
  }, [searchFilters.state, activeTab]);

  const fetchDatabaseStats = async () => {
    try {
      const response = await axios.get(`${API}/property-data/stats`);
      if (response.data.success) {
        setDbStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchPostcodes = async (state: string) => {
    setLoadingPostcodes(true);
    try {
      const response = await axios.get(`${API}/property-data/postcodes?state=${state}`);
      if (response.data.success) {
        setPostcodes(response.data.postcodes);
      }
    } catch (error) {
      console.error("Error fetching postcodes:", error);
      setPostcodes([]);
    } finally {
      setLoadingPostcodes(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error("Please select a CSV file");
        return;
      }
      setSelectedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleAutoFetch = async () => {
    setImporting(true);

    try {
      toast.info(`Attempting to fetch latest ${selectedState} property data...`);

      const response = await axios.post(
        `${API}/property-data/auto-fetch?state=${selectedState}`,
        {},
        { timeout: 180000 }
      );

      if (response.data.success) {
        toast.success(
          `Auto-fetch complete! ${response.data.imported} new, ${response.data.updated} updated`
        );
        fetchDatabaseStats();
      }
    } catch (error) {
      console.error("Error auto-fetching data:", error);
      toast.error(
        `Auto-fetch unavailable. Please download CSV manually and use the upload feature below.`
      );
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file first");
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(
        `${API}/property-data/import-csv?state=${selectedState}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000
        }
      );

      if (response.data.success) {
        toast.success(
          `Import complete! ${response.data.imported} new, ${response.data.updated} updated`
        );
        setSelectedFile(null);
        fetchDatabaseStats();
      }
    } catch (error: any) {
      console.error("Error importing CSV:", error);
      toast.error(`Import failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();

      if (searchFilters.suburb) params.append("suburb", searchFilters.suburb);
      if (searchFilters.state) params.append("state", searchFilters.state);
      if (searchFilters.property_type) params.append("property_type", searchFilters.property_type);
      if (searchFilters.min_price) params.append("min_price", searchFilters.min_price);
      if (searchFilters.max_price) params.append("max_price", searchFilters.max_price);
      if (searchFilters.from_date) params.append("from_date", searchFilters.from_date);
      if (searchFilters.to_date) params.append("to_date", searchFilters.to_date);
      params.append("limit", "100");

      const response = await axios.get(`${API}/property-data/search?${params.toString()}`);

      if (response.data.success) {
        setSearchResults(response.data.sales);
        toast.success(`Found ${response.data.count} properties`);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "0.75rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              padding: "0.5rem",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "white",
              flexShrink: 0
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "white", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <Database size={24} />
              Property Data
            </h1>
            <p style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
              Import data, browse, analyze trends
            </p>
          </div>
        </div>

        {/* Database Stats Card */}
        {dbStats && (
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "1rem",
            marginBottom: "1rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.75rem" }}>Database Statistics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
              <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Total Sales</div>
                <div style={{ fontSize: "1.875rem", fontWeight: "700", color: "#1f2937" }}>
                  {dbStats.total_sales.toLocaleString()}
                </div>
              </div>
              {dbStats.by_state && Object.entries(dbStats.by_state).map(([state, count]) => (
                <div key={state} style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>{state}</div>
                  <div style={{ fontSize: "1.875rem", fontWeight: "700", color: "#1f2937" }}>
                    {count.toLocaleString()}
                  </div>
                  {dbStats.postcodes_by_state?.[state] && (
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      {dbStats.postcodes_by_state[state]} postcodes
                    </div>
                  )}
                </div>
              ))}
              {dbStats.date_range && (
                <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Date Range</div>
                  <div style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937" }}>
                    {dbStats.date_range.oldest} to {dbStats.date_range.newest}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("import")}
            style={{
              background: activeTab === "import" ? "white" : "rgba(255, 255, 255, 0.3)",
              color: activeTab === "import" ? "#667eea" : "white",
              border: "none",
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={() => setActiveTab("browse")}
            style={{
              background: activeTab === "browse" ? "white" : "rgba(255, 255, 255, 0.3)",
              color: activeTab === "browse" ? "#667eea" : "white",
              border: "none",
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <Search size={16} />
            Browse
          </button>
          <button
            onClick={() => router.push("/growth-trends")}
            style={{
              background: "rgba(255, 255, 255, 0.3)",
              color: "white",
              border: "none",
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem"
            }}
          >
            <TrendingUp size={16} />
            Trends
          </button>
        </div>

        {/* Content */}
        <div style={{ background: "white", borderRadius: "12px", padding: "1rem", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          {activeTab === "import" && (
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>Import Property Sales Data</h2>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  style={{
                    width: "200px",
                    padding: "0.75rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem"
                  }}
                >
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                </select>
              </div>

              {/* Auto-Fetch Section */}
              <div style={{
                marginBottom: "2rem",
                padding: "1.5rem",
                background: "#fef3c7",
                borderRadius: "12px",
                border: "2px solid #fbbf24"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginTop: 0, marginBottom: "0.75rem", color: "#92400e" }}>
                  Automatic Data Fetch (Beta)
                </h3>
                <p style={{ marginBottom: "1rem", color: "#78350f", lineHeight: "1.5" }}>
                  We attempt to automatically fetch NSW data from government sources. However, direct download URLs are not consistently available.
                </p>
                <button
                  onClick={handleAutoFetch}
                  disabled={importing || (selectedState !== "NSW")}
                  style={{
                    padding: "1rem 2rem",
                    background: importing || selectedState !== "NSW" ? "#d1d5db" : "#fbbf24",
                    color: importing || selectedState !== "NSW" ? "#6b7280" : "#78350f",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "700",
                    cursor: importing || selectedState !== "NSW" ? "not-allowed" : "pointer",
                    marginBottom: "0.75rem"
                  }}
                >
                  {importing ? "Attempting..." : "Try Auto-Fetch (NSW Only)"}
                </button>
                <div style={{ fontSize: "0.875rem", color: "#92400e" }}>
                  <strong>If auto-fetch fails:</strong> Download CSV from{" "}
                  <a href="https://nswpropertysalesdata.com" target="_blank" rel="noopener noreferrer" style={{ color: "#059669", textDecoration: "underline" }}>
                    nswpropertysalesdata.com
                  </a>{" "}
                  or{" "}
                  <a href="https://data.nsw.gov.au/search?tags=sales" target="_blank" rel="noopener noreferrer" style={{ color: "#059669", textDecoration: "underline" }}>
                    data.nsw.gov.au
                  </a>
                  {" "}and use manual upload below.
                </div>
              </div>

              <div style={{
                height: "2px",
                background: "#e5e7eb",
                marginBottom: "2rem"
              }} />

              <h3 style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                marginBottom: "1rem",
                color: "#667eea"
              }}>
                Manual CSV Upload (Recommended)
              </h3>
              <p style={{ color: "#6b7280", marginBottom: "1rem", fontSize: "0.875rem" }}>
                Download property sales data from official sources and upload here
              </p>

              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  htmlFor="csv-upload"
                  style={{
                    display: "inline-block",
                    padding: "1rem 2rem",
                    background: "#667eea",
                    color: "white",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  <Upload size={20} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
                  Choose CSV File
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                {selectedFile && (
                  <div style={{ marginTop: "1rem", padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                    <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>

              <button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                style={{
                  padding: "1rem 2rem",
                  background: selectedFile && !importing ? "#10b981" : "#d1d5db",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: selectedFile && !importing ? "pointer" : "not-allowed"
                }}
              >
                {importing ? "Importing..." : "Import Data"}
              </button>

              <div style={{ marginTop: "2rem", padding: "1rem", background: "#fef3c7", borderRadius: "8px", border: "2px solid #fbbf24" }}>
                <h4 style={{ marginTop: 0, color: "#92400e" }}>CSV Format Requirements:</h4>
                <ul style={{ color: "#78350f", marginBottom: 0 }}>
                  <li><strong>Required:</strong> Address, Suburb, Postcode, Property Type, Sale Price, Sale Date</li>
                  <li><strong>Optional:</strong> List Price (asking/advertised price), Beds, Baths, Carpark, Land Area</li>
                  <li><strong>Price formats:</strong> Can include $ and commas (e.g., $850,000 or 850000)</li>
                  <li><strong>Date format:</strong> DD/MM/YYYY or YYYY-MM-DD</li>
                  <li>Duplicate sales (same address + date) will be updated, not duplicated</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "browse" && (
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>Browse Property Sales Database</h2>

              {/* Step 1: Select State */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>Step 1: Select State</h3>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {["NSW", "VIC", "QLD"].map(state => (
                    <button
                      key={state}
                      onClick={() => {
                        setSearchFilters({...searchFilters, state});
                        setSelectedPostcode("");
                        setSearchResults([]);
                      }}
                      style={{
                        padding: "1rem 2rem",
                        background: searchFilters.state === state ? "#667eea" : "#f3f4f6",
                        color: searchFilters.state === state ? "white" : "#374151",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        minWidth: "120px"
                      }}
                    >
                      {state}
                      {dbStats?.by_state?.[state] && (
                        <div style={{ fontSize: "0.875rem", marginTop: "0.25rem", opacity: 0.9 }}>
                          {dbStats.by_state[state].toLocaleString()} sales
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Postcode */}
              {searchFilters.state && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
                    Step 2: Select Postcode in {searchFilters.state}
                    {dbStats?.postcodes_by_state?.[searchFilters.state] && (
                      <span style={{ fontSize: "0.875rem", fontWeight: "400", color: "#6b7280", marginLeft: "0.5rem" }}>
                        ({dbStats.postcodes_by_state[searchFilters.state]} postcodes)
                      </span>
                    )}
                  </h3>

                  {loadingPostcodes ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                      Loading postcodes...
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                      gap: "0.75rem",
                      maxHeight: "400px",
                      overflowY: "auto",
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "8px"
                    }}>
                      {postcodes.map(pc => (
                        <button
                          key={`${pc.postcode}-${pc.suburb}`}
                          onClick={() => {
                            setSelectedPostcode(pc.postcode);
                            setSearchFilters({...searchFilters, suburb: pc.suburb});
                            handleSearch();
                          }}
                          style={{
                            padding: "0.75rem",
                            background: selectedPostcode === pc.postcode ? "#667eea" : "white",
                            color: selectedPostcode === pc.postcode ? "white" : "#1f2937",
                            border: "2px solid",
                            borderColor: selectedPostcode === pc.postcode ? "#667eea" : "#e5e7eb",
                            borderRadius: "8px",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ fontWeight: "700", fontSize: "1.125rem" }}>{pc.postcode}</div>
                          <div style={{ fontSize: "0.875rem", opacity: 0.9 }}>{pc.suburb}</div>
                          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", opacity: 0.8 }}>
                            {pc.count} sales - Avg ${(pc.avg_price / 1000).toFixed(0)}K
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Additional Filters */}
              {searchFilters.state && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>Step 3: Additional Filters (Optional)</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Property Type</label>
                      <input
                        type="text"
                        placeholder="e.g., House"
                        value={searchFilters.property_type}
                        onChange={(e) => setSearchFilters({...searchFilters, property_type: e.target.value})}
                        style={{ width: "100%", padding: "0.5rem", border: "2px solid #e5e7eb", borderRadius: "8px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Min Price</label>
                      <input
                        type="number"
                        placeholder="e.g., 500000"
                        value={searchFilters.min_price}
                        onChange={(e) => setSearchFilters({...searchFilters, min_price: e.target.value})}
                        style={{ width: "100%", padding: "0.5rem", border: "2px solid #e5e7eb", borderRadius: "8px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Max Price</label>
                      <input
                        type="number"
                        placeholder="e.g., 1000000"
                        value={searchFilters.max_price}
                        onChange={(e) => setSearchFilters({...searchFilters, max_price: e.target.value})}
                        style={{ width: "100%", padding: "0.5rem", border: "2px solid #e5e7eb", borderRadius: "8px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>From Date</label>
                      <input
                        type="date"
                        value={searchFilters.from_date}
                        onChange={(e) => setSearchFilters({...searchFilters, from_date: e.target.value})}
                        style={{ width: "100%", padding: "0.5rem", border: "2px solid #e5e7eb", borderRadius: "8px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>To Date</label>
                      <input
                        type="date"
                        value={searchFilters.to_date}
                        onChange={(e) => setSearchFilters({...searchFilters, to_date: e.target.value})}
                        style={{ width: "100%", padding: "0.5rem", border: "2px solid #e5e7eb", borderRadius: "8px" }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    style={{
                      padding: "0.75rem 2rem",
                      background: "#667eea",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: searching ? "not-allowed" : "pointer",
                      marginTop: "1rem"
                    }}
                  >
                    {searching ? "Searching..." : "Refine Search"}
                  </button>
                </div>
              )}

              {/* Results */}
              {searchResults.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>Address</th>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>Suburb</th>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>Type</th>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>List Price</th>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>Sold Price</th>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>Difference</th>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>Sale Date</th>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>Beds</th>
                        <th style={{ padding: "0.75rem", fontWeight: "600" }}>Baths</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((sale, index) => {
                        const diff = sale.list_price && sale.sale_price ? sale.sale_price - sale.list_price : null;
                        const diffPercent = diff && sale.list_price ? ((diff / sale.list_price) * 100).toFixed(1) : null;

                        return (
                          <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "0.75rem" }}>{sale.address}</td>
                            <td style={{ padding: "0.75rem" }}>{sale.suburb}</td>
                            <td style={{ padding: "0.75rem" }}>{sale.property_type || "N/A"}</td>
                            <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                              {sale.list_price ? `$${sale.list_price.toLocaleString()}` : "-"}
                            </td>
                            <td style={{ padding: "0.75rem", fontWeight: "600", color: "#059669" }}>
                              ${sale.sale_price.toLocaleString()}
                            </td>
                            <td style={{
                              padding: "0.75rem",
                              fontWeight: "600",
                              color: diff && diff > 0 ? "#059669" : diff && diff < 0 ? "#dc2626" : "#6b7280"
                            }}>
                              {diffPercent ? `${diff && diff > 0 ? '+' : ''}${diffPercent}%` : "-"}
                            </td>
                            <td style={{ padding: "0.75rem" }}>{sale.sale_date}</td>
                            <td style={{ padding: "0.75rem" }}>{sale.beds || "N/A"}</td>
                            <td style={{ padding: "0.75rem" }}>{sale.baths || "N/A"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {searchResults.length === 0 && !searching && (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  Use the filters above and click Search to browse your property database
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
