# EstatePro Property App - Setup Guide

This is a comprehensive real estate platform for property listing, AI-generated selling pitches, and detailed property evaluations, primarily for the Australian market.

## Project Structure

```
propertyval/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── abs_api.py         # Australian Bureau of Statistics API integration
│   ├── domain_api.py      # Domain.com.au API integration
│   ├── rba_api.py         # Reserve Bank of Australia API integration
│   ├── property_scraper.py
│   ├── data_fetcher.py
│   ├── portfolio_importer.py
│   └── ...
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page (needs conversion)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles (updated)
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── GooglePlacesAutocomplete.js
│   ├── FacebookAdPreview.js
│   └── ...
├── lib/                  # Utility functions
├── hooks/                # Custom React hooks
├── utils/                # Helper utilities
└── public/               # Static assets
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - Database (requires running instance)
- **OpenAI GPT-4** - AI content generation
- **Stripe** - Payment processing
- **Domain API, RBA API, ABS API** - Property data sources

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **Shadcn UI** - Component library
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **jsPDF** - PDF generation

## Setup Instructions

### 1. Backend Setup

#### Install Python Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Configure Environment Variables
```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required API Keys:
- **MongoDB**: Install and run MongoDB locally or use MongoDB Atlas
- **OpenAI API Key**: Get from https://platform.openai.com/
- **Google Maps API Key**: Get from https://console.cloud.google.com/
- **Stripe Keys**: Get from https://dashboard.stripe.com/
- **Domain API Key**: Get from https://developer.domain.com.au/

#### Run Backend Server
```bash
uvicorn server:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### 2. Frontend Setup

#### Install Node Dependencies
Dependencies are already installed via `npm install --legacy-peer-deps`

#### Configure Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local and add your configuration
```

#### Convert Pages from React to Next.js

The original app uses Create React App with React Router. You need to convert the pages to Next.js App Router format:

**Original Pages to Convert:**
- `HomePage.js` → `app/page.tsx`
- `PropertyDetail.js` → `app/property/[id]/page.tsx`
- `PropertyEvaluation.js` → `app/property/[id]/evaluation/page.tsx`
- `QuickEvaluation.js` → `app/quick-evaluation/page.tsx`
- `Settings.js` → `app/settings/page.tsx`
- `MarketSettings.js` → `app/settings/market/page.tsx`
- `LocationSettings.js` → `app/settings/locations/page.tsx`
- `MarketingSettings.js` → `app/settings/marketing/page.tsx`
- `DataManagement.js` → `app/data-management/page.tsx`
- `GrowthTrends.js` → `app/growth-trends/page.tsx`
- `SoldProperties.js` → `app/sold-properties/page.tsx`
- `PortfolioImport.js` → `app/portfolio-import/page.tsx`
- `Login.js` → `app/login/page.tsx`
- `Register.js` → `app/register/page.tsx`

**Conversion Steps for Each Page:**
1. Create the appropriate directory structure in `app/`
2. Add `"use client"` directive at the top (most pages use client-side hooks)
3. Convert imports from `@/` paths
4. Replace `react-router-dom` navigation with Next.js `useRouter` from `next/navigation`
5. Update API calls to use `process.env.NEXT_PUBLIC_BACKEND_URL`

**Example Conversion:**

Original React page (`HomePage.js`):
```javascript
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function HomePage() {
  const navigate = useNavigate();
  // ... component code
}

export default HomePage;
```

Next.js page (`app/page.tsx`):
```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function HomePage() {
  const router = useRouter();
  // ... component code (replace navigate() with router.push())
}
```

### 3. Database Setup

#### Install MongoDB
- **macOS**: `brew install mongodb-community`
- **Ubuntu**: Follow [MongoDB docs](https://docs.mongodb.com/manual/installation/)
- **Windows**: Download from [MongoDB website](https://www.mongodb.com/try/download/community)

#### Start MongoDB
```bash
mongod --dbpath /path/to/data/directory
```

Or use **MongoDB Atlas** (cloud hosted) for easier setup.

### 4. Running the Application

#### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
uvicorn server:app --reload --port 8000
```

#### Terminal 2 - Frontend
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Key Features to Implement

### Property Management
- Create, edit, delete listings (up to 25 photos)
- Property lifecycle tracking (listing → sold → resell)
- Image compression and upload
- Google Places Autocomplete for addresses

### AI Features
- Auto-populate property details via AI Vision
- Generate AI selling pitches
- Create social media copy
- Generate Facebook ads

### Property Evaluation
- Multi-stage evaluation process with status tracking
- Integration with Domain API, RBA API, ABS API
- PDF export of evaluation reports
- Report editing capabilities
- Upload personal RP Data reports

### Data Management
- Automated and manual (CSV) import of property sales data
- Data categorized by state/postcode
- Analytics for growth trends
- List vs. sold price comparison

### Monetization
- Two-tier Stripe subscription (Basic/Pro)
- 7-day trial period
- Payment processing integration

### SaaS Features
- Agent management
- Portfolio import capabilities
- Personal sales history tracking
- Localized evaluations based on agent data

## API Endpoints Overview

### Properties
- `POST /api/properties` - Create property
- `GET /api/properties` - List properties
- `GET /api/properties/{id}` - Get property details
- `PUT /api/properties/{id}` - Update property
- `DELETE /api/properties/{id}` - Delete property
- `POST /api/properties/{id}/mark-sold` - Mark as sold
- `POST /api/properties/{id}/resell` - Resell property

### Evaluations
- `POST /api/properties/{id}/evaluate` - Start evaluation
- `GET /api/evaluations/{id}` - Get evaluation results
- `GET /api/evaluations/{id}/status` - Check evaluation status

### AI Content
- `POST /api/generate-pitch` - Generate selling pitch
- `POST /api/generate-social-copy` - Generate social media content
- `POST /api/analyze-images` - Analyze property images

### Data Management
- `POST /api/sales-data/upload` - Upload sales data CSV
- `GET /api/sales-data` - Get sales data
- `GET /api/sales-data/stats` - Get sales statistics

### Agent Management
- `POST /api/agents` - Create agent
- `GET /api/agents/{id}` - Get agent details
- `POST /api/agents/{id}/import-portfolio` - Import portfolio

## Original App Information

This app was built using Emergent.sh, a platform for full-stack AI development. The original export includes:
- Complete backend with FastAPI
- React frontend with Shadcn UI
- Test files for various features
- Summary documentation in `.emergent/summary.txt`

## Next Steps

1. ✅ Backend copied and configured
2. ✅ Components and utilities copied
3. ✅ Dependencies installed
4. ⏳ Convert pages from React to Next.js (IN PROGRESS)
5. ⏳ Set up environment variables
6. ⏳ Start MongoDB
7. ⏳ Test backend API endpoints
8. ⏳ Test frontend pages
9. ⏳ Configure Stripe webhooks
10. ⏳ Deploy to production

## Troubleshooting

### Dependency Issues
If you encounter peer dependency warnings:
```bash
npm install --legacy-peer-deps
```

### MongoDB Connection Issues
Check your `MONGODB_URL` in `backend/.env` matches your MongoDB instance.

### API Key Issues
Ensure all required API keys are set in environment variables.

### CORS Issues
The backend is configured to allow requests from `http://localhost:3000`. Update CORS settings in `backend/server.py` if needed.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Stripe Documentation](https://stripe.com/docs)

## Support

For questions about the original Emergent.sh implementation, refer to `.emergent/summary.txt` which contains detailed development history and technical concepts.
