"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Upload, Download, ArrowLeft, Users, Home, UserPlus, Building } from "lucide-react";
import { API } from "@/lib/config";
import { usePageView } from "@/hooks/useAudit";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  agency_name?: string;
}

interface ImportResult {
  success: boolean;
  agents: {
    total: number;
    created: number;
    updated: number;
  };
  properties: {
    total: number;
    created: number;
    updated: number;
  };
  errors?: string[];
}

export default function PortfolioImport() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Track page view for audit
  usePageView('portfolio-import');

  // Agent creation
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    phone: '',
    agency_name: 'My Agency',
    bio: ''
  });
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API}/agents`);
      if (response.data.success) {
        setAgents(response.data.agents);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const handleAgentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAgentForm({
      ...agentForm,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agentForm.name || !agentForm.email) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const response = await axios.post(`${API}/agents`, agentForm);

      if (response.data.success) {
        toast.success(`Agent ${agentForm.name} created successfully!`);
        setAgentForm({ name: '', email: '', phone: '', agency_name: 'My Agency', bio: '' });
        setShowAgentForm(false);
        fetchAgents();
      }
    } catch (error: any) {
      console.error("Error creating agent:", error);
      toast.error(error.response?.data?.detail || "Failed to create agent");
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

  const downloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/portfolio/csv-template`);
      const template = response.data.template;

      // Create blob and download
      const blob = new Blob([template], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'portfolio_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Template downloaded!");
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Failed to download template");
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
      toast.info("Importing portfolio... This may take a minute", { id: 'import-progress' });

      const response = await axios.post(
        `${API}/portfolio/import`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 180000 // 3 minutes
        }
      );

      if (response.data.success) {
        setImportResult(response.data);
        toast.success(
          `Import complete! ${response.data.agents.created} agents, ${response.data.properties.created} properties created`,
          { id: 'import-progress', duration: 8000 }
        );
        setSelectedFile(null);
      }
    } catch (error: any) {
      console.error("Error importing portfolio:", error);
      toast.error(`Import failed: ${error.response?.data?.detail || error.message}`, { id: 'import-progress' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "0.75rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
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
            <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "white", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Upload size={20} />
              Portfolio Import
            </h1>
            <p style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
              Import agency portfolio with agents
            </p>
          </div>
        </div>

        {/* Agent Management Card */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "1rem",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "1rem"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={20} />
              Agent Management
            </h2>
            <button
              onClick={() => setShowAgentForm(!showAgentForm)}
              style={{
                padding: "0.6rem 1rem",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                width: "100%"
              }}
            >
              <UserPlus size={16} />
              {showAgentForm ? "Cancel" : "Create New Agent"}
            </button>
          </div>

          {showAgentForm && (
            <form onSubmit={handleCreateAgent} style={{
              padding: "1rem",
              background: "#f3f4f6",
              borderRadius: "10px",
              marginBottom: "1rem"
            }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem" }}>
                New Agent Profile
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={agentForm.name}
                    onChange={handleAgentFormChange}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem"
                    }}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={agentForm.email}
                    onChange={handleAgentFormChange}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem"
                    }}
                    placeholder="john@agency.com"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={agentForm.phone}
                    onChange={handleAgentFormChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem"
                    }}
                    placeholder="0412 345 678"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                    Agency Name
                  </label>
                  <input
                    type="text"
                    name="agency_name"
                    value={agentForm.agency_name}
                    onChange={handleAgentFormChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "1rem"
                    }}
                    placeholder="My Agency"
                  />
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", fontSize: "0.875rem" }}>
                  Bio (optional)
                </label>
                <textarea
                  name="bio"
                  value={agentForm.bio}
                  onChange={handleAgentFormChange}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "1rem",
                    resize: "vertical"
                  }}
                  placeholder="Brief bio about the agent..."
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: "0.75rem 2rem",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "1rem"
                }}
              >
                Create Agent
              </button>
            </form>
          )}

          {/* Existing Agents List */}
          {agents.length > 0 && (
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "#6b7280" }}>
                Existing Agents ({agents.length})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                {agents.map((agent) => (
                  <div key={agent.id} style={{
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb"
                  }}>
                    <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{agent.name}</div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{agent.email}</div>
                    {agent.phone && (
                      <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{agent.phone}</div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.5rem" }}>
                      <Building size={12} style={{ display: "inline", marginRight: "0.25rem" }} />
                      {agent.agency_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Card */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "2rem"
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>
            Bulk Import Properties & Agents
          </h2>

          {/* Step 1: Download Template */}
          <div style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            background: "#eff6ff",
            borderRadius: "12px",
            border: "2px solid #3b82f6"
          }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1rem", color: "#1e40af" }}>
              Step 1: Download CSV Template
            </h3>
            <p style={{ color: "#1e40af", marginBottom: "1rem" }}>
              Download our template to see the required format. Fill it with your properties and agents.
            </p>
            <button
              onClick={downloadTemplate}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <Download size={20} />
              Download Template
            </button>
          </div>

          {/* Step 2: Upload CSV */}
          <div style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            background: "#f0fdf4",
            borderRadius: "12px",
            border: "2px solid #10b981"
          }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1rem", color: "#166534" }}>
              Step 2: Upload Filled CSV
            </h3>
            <p style={{ color: "#166534", marginBottom: "1rem" }}>
              Once you&apos;ve filled the template with your data, upload it here.
            </p>

            <label
              htmlFor="portfolio-upload"
              style={{
                display: "inline-block",
                padding: "1rem 2rem",
                background: "#10b981",
                color: "white",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                marginBottom: "1rem"
              }}
            >
              <Upload size={20} style={{ verticalAlign: "middle", marginRight: "0.5rem" }} />
              Choose CSV File
            </label>
            <input
              id="portfolio-upload"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            {selectedFile && (
              <div style={{
                padding: "1rem",
                background: "white",
                borderRadius: "8px",
                marginTop: "1rem",
                border: "2px solid #86efac"
              }}>
                <strong style={{ color: "#166534" }}>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          {/* Step 3: Import */}
          <div style={{
            padding: "1.5rem",
            background: "#fef3c7",
            borderRadius: "12px",
            border: "2px solid #fbbf24"
          }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1rem", color: "#92400e" }}>
              Step 3: Import
            </h3>
            <p style={{ color: "#92400e", marginBottom: "1rem" }}>
              Click import to add all agents and properties to your system.
            </p>
            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              style={{
                padding: "1rem 2rem",
                background: selectedFile && !importing ? "#f59e0b" : "#d1d5db",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "700",
                cursor: selectedFile && !importing ? "pointer" : "not-allowed"
              }}
            >
              {importing ? "Importing..." : "Import Portfolio"}
            </button>
          </div>
        </div>

        {/* Import Results */}
        {importResult && (
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#10b981" }}>
              Import Successful!
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <div style={{ padding: "1rem", background: "#eff6ff", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Users size={20} style={{ color: "#3b82f6" }} />
                  <div style={{ fontSize: "0.875rem", color: "#1e40af", fontWeight: "600" }}>Agents</div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#1e40af" }}>
                  {importResult.agents.total}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {importResult.agents.created} created, {importResult.agents.updated} updated
                </div>
              </div>

              <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Home size={20} style={{ color: "#10b981" }} />
                  <div style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "600" }}>Properties</div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#166534" }}>
                  {importResult.properties.total}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {importResult.properties.created} created, {importResult.properties.updated} updated
                </div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{
                padding: "1rem",
                background: "#fee2e2",
                borderRadius: "8px",
                marginBottom: "1.5rem"
              }}>
                <h4 style={{ color: "#991b1b", marginTop: 0 }}>Errors ({importResult.errors.length}):</h4>
                <ul style={{ color: "#dc2626", marginBottom: 0 }}>
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {importResult.errors.length > 10 && (
                    <li>... and {importResult.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => router.push("/")}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                View Properties
              </button>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginTop: "2rem"
        }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>
            CSV Format Requirements
          </h3>
          <ul style={{ color: "#6b7280", lineHeight: "1.8" }}>
            <li><strong>Agent Name</strong>: Full name of the agent (e.g., &quot;John Smith&quot;)</li>
            <li><strong>Agent Email</strong>: Unique email for each agent</li>
            <li><strong>Address</strong>: Full property address</li>
            <li><strong>Beds, Baths, Carpark</strong>: Numbers</li>
            <li><strong>Price</strong>: List price (can include $ and commas)</li>
            <li><strong>Status</strong>: &quot;active&quot; or &quot;sold&quot;</li>
            <li><strong>Sold Price</strong>: Required if status is &quot;sold&quot;</li>
            <li><strong>Sale Date</strong>: YYYY-MM-DD format if sold</li>
            <li><strong>Photos</strong>: Comma-separated URLs (optional)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
