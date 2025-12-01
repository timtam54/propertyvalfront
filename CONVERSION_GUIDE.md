# React to Next.js Page Conversion Guide

This guide shows you how to convert the original React pages to Next.js App Router format.

## Quick Reference

### Original React Structure
```
frontend/src/
├── App.js (routing)
├── pages/
│   ├── HomePage.js
│   ├── PropertyDetail.js
│   └── ...
```

### New Next.js Structure
```
app/
├── page.tsx (HomePage)
├── property/
│   └── [id]/
│       ├── page.tsx (PropertyDetail)
│       └── evaluation/
│           └── page.tsx (PropertyEvaluation)
├── settings/
│   ├── page.tsx
│   ├── market/
│   │   └── page.tsx
│   └── ...
```

## Key Differences

### 1. Imports

**React (CRA):**
```javascript
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Component from "../components/Component";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
```

**Next.js:**
```typescript
"use client";  // Add this for client components

import { useState } from "react";
import { useRouter } from "next/navigation";  // Changed
import Component from "@/components/Component";  // Changed

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;  // Changed prefix
```

### 2. Navigation

**React Router:**
```javascript
const navigate = useNavigate();
navigate("/property/" + id);
navigate(-1);  // Go back
```

**Next.js:**
```typescript
const router = useRouter();
router.push(`/property/${id}`);
router.back();  // Go back
```

### 3. Route Parameters

**React Router:**
```javascript
import { useParams } from "react-router-dom";
const { id } = useParams();
```

**Next.js:**
```typescript
// In app/property/[id]/page.tsx
export default function PropertyDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  // ...
}
```

### 4. "use client" Directive

Add `"use client";` at the top of any component that uses:
- `useState`, `useEffect`, `useCallback`, etc.
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`window`, `document`, etc.)

## Step-by-Step Conversion Example

### Original: `src/pages/Settings.js`

```javascript
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      toast.error("Failed to load settings");
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API}/settings`, settings);
      toast.success("Settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  return (
    <div>
      <button onClick={() => navigate("/")}>Back to Home</button>
      <h1>Settings</h1>
      {/* ... rest of component */}
    </div>
  );
}

export default Settings;
```

### Converted: `app/settings/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      toast.error("Failed to load settings");
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API}/settings`, settings);
      toast.success("Settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  return (
    <div>
      <button onClick={() => router.push("/")}>Back to Home</button>
      <h1>Settings</h1>
      {/* ... rest of component */}
    </div>
  );
}
```

## Changes Made:
1. ✅ Added `"use client";` directive
2. ✅ Changed `useNavigate` to `useRouter` from `next/navigation`
3. ✅ Changed `REACT_APP_` to `NEXT_PUBLIC_` in env variable
4. ✅ Changed function declaration to `export default function`
5. ✅ Changed `navigate()` calls to `router.push()`
6. ✅ File extension changed to `.tsx` (TypeScript)

## Pages Requiring Conversion

Here's the complete list of pages to convert:

| Original File | New Location | Complexity |
|---------------|--------------|------------|
| `HomePage.js` | `app/page.tsx` | High |
| `PropertyDetail.js` | `app/property/[id]/page.tsx` | High |
| `PropertyEvaluation.js` | `app/property/[id]/evaluation/page.tsx` | High |
| `QuickEvaluation.js` | `app/quick-evaluation/page.tsx` | Medium |
| `Settings.js` | `app/settings/page.tsx` | Low |
| `MarketSettings.js` | `app/settings/market/page.tsx` | Medium |
| `LocationSettings.js` | `app/settings/locations/page.tsx` | Medium |
| `MarketingSettings.js` | `app/settings/marketing/page.tsx` | Medium |
| `DataManagement.js` | `app/data-management/page.tsx` | High |
| `GrowthTrends.js` | `app/growth-trends/page.tsx` | Medium |
| `SoldProperties.js` | `app/sold-properties/page.tsx` | Medium |
| `PortfolioImport.js` | `app/portfolio-import/page.tsx` | Medium |
| `Login.js` | `app/login/page.tsx` | Low |
| `Register.js` | `app/register/page.tsx` | Low |

## Tips

### 1. Component Imports
All components in the `/components` directory will work as-is. Just update the import paths:
```typescript
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import { Button } from "@/components/ui/button";
```

### 2. Handling Images
Use Next.js Image component for optimization:
```typescript
import Image from "next/image";

<Image src={imageUrl} alt="Property" width={400} height={300} />
```

### 3. Dynamic Routes
Create folders with brackets for dynamic segments:
- `app/property/[id]/page.tsx` → `/property/123`
- `app/property/[id]/evaluation/page.tsx` → `/property/123/evaluation`

### 4. Layouts
Create `layout.tsx` files for shared layouts:
```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 5. Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

## Common Issues

### Issue: "window is not defined"
**Solution:** Use `useEffect` or check if window exists:
```typescript
if (typeof window !== 'undefined') {
  // Browser-only code
}
```

### Issue: Components not re-rendering
**Solution:** Ensure you have `"use client";` directive

### Issue: API calls failing
**Solution:** Check that `.env.local` has `NEXT_PUBLIC_` prefix and restart dev server

### Issue: Routing not working
**Solution:** Use `router.push()` not `navigate()`

## Testing Your Conversion

1. Start the backend: `cd backend && uvicorn server:app --reload --port 8000`
2. Start Next.js: `npm run dev`
3. Visit `http://localhost:3000`
4. Test each converted page
5. Check browser console for errors

## Need Help?

- Refer to original pages in `/tmp/property-app-main/frontend/src/pages/`
- Check Next.js docs: https://nextjs.org/docs
- Look at the example conversion in `app/example/page.tsx`
