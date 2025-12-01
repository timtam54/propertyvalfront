// Backend URL configuration
// NEXT_PUBLIC_BACKEND_URL is inlined at build time by Next.js

// For production, use the Vercel backend URL
// For local development, NEXT_PUBLIC_BACKEND_URL should be set in .env.local to http://localhost:8000
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-ts-gamma.vercel.app';
export const API = `${BACKEND_URL}/api`;
