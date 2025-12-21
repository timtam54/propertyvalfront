// Backend URL configuration
// NEXT_PUBLIC_BACKEND_URL is inlined at build time by Next.js

// For production, use the Azure backend URL
// For local development, use local proxy to avoid CORS issues
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://propertyval-api.azurewebsites.net';

// Use local proxy API when running on localhost to avoid CORS issues
const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
export const API = isLocalDev ? '/api/proxy' : `${BACKEND_URL}/api`;
