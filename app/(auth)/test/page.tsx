'use client';

import { useState, useEffect } from 'react';

interface EndpointResult {
  name: string;
  url?: string;
  method?: string;
  requestBody?: any;
  status?: number;
  statusText?: string;
  data?: any;
  error?: string;
}

interface TestResults {
  apiKeySet: boolean;
  apiKeyMasked?: string;
  testAddress?: string;
  suburb?: string;
  state?: string;
  beds?: number;
  baths?: number;
  propertyType?: string;
  endpoints?: EndpointResult[];
  error?: string;
}

export default function TestPage() {
  const [results, setResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-domain');
      const data = await response.json();
      setResults(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ marginBottom: '20px' }}>Domain API Test Page</h1>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>Test Property:</h3>
        <p><strong>Address:</strong> 26 Stanton Terrace Rd, North Ward QLD 4810, Australia</p>
        <p><strong>Bedrooms:</strong> 3 | <strong>Bathrooms:</strong> 2 | <strong>Car Parks:</strong> 1 | <strong>Size:</strong> 120 sqm</p>
      </div>

      <button
        onClick={runTest}
        disabled={loading}
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Run Domain API Test'}
      </button>

      {error && (
        <div style={{ padding: '15px', backgroundColor: '#ffcccc', borderRadius: '5px', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div>
          <div style={{
            padding: '15px',
            backgroundColor: results.apiKeySet ? '#ccffcc' : '#ffcccc',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h3>API Key Status</h3>
            <p><strong>Key Set:</strong> {results.apiKeySet ? 'YES' : 'NO'}</p>
            {results.apiKeyMasked && <p><strong>Key:</strong> {results.apiKeyMasked}</p>}
          </div>

          {results.endpoints && results.endpoints.map((endpoint, index) => (
            <div
              key={index}
              style={{
                padding: '15px',
                backgroundColor: endpoint.status === 200 ? '#e6ffe6' : '#ffe6e6',
                borderRadius: '5px',
                marginBottom: '15px',
                border: `2px solid ${endpoint.status === 200 ? '#00cc00' : '#cc0000'}`
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>
                {endpoint.status === 200 ? '✅' : '❌'} {endpoint.name}
              </h3>

              {endpoint.url && (
                <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  <strong>URL:</strong> {endpoint.method === 'POST' ? 'POST ' : 'GET '}{endpoint.url}
                </p>
              )}

              {endpoint.status && (
                <p><strong>Status:</strong> {endpoint.status} {endpoint.statusText}</p>
              )}

              {endpoint.error && (
                <p style={{ color: '#cc0000' }}><strong>Error:</strong> {endpoint.error}</p>
              )}

              {endpoint.requestBody && (
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer' }}>Request Body</summary>
                  <pre style={{
                    backgroundColor: '#fff',
                    padding: '10px',
                    borderRadius: '3px',
                    overflow: 'auto',
                    fontSize: '11px'
                  }}>
                    {JSON.stringify(endpoint.requestBody, null, 2)}
                  </pre>
                </details>
              )}

              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer' }}>Response Data</summary>
                <pre style={{
                  backgroundColor: '#fff',
                  padding: '10px',
                  borderRadius: '3px',
                  overflow: 'auto',
                  maxHeight: '400px',
                  fontSize: '11px'
                }}>
                  {typeof endpoint.data === 'string'
                    ? endpoint.data
                    : JSON.stringify(endpoint.data, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
