# EstatePro Property App - Setup Guide

This is a comprehensive real estate platform for property listing, AI-generated selling pitches, and detailed property evaluations, primarily for the Australian market.

## Project Structure

```
propertyval/
├── backend-ts/             # TypeScript/Express backend
│   ├── src/
│   │   ├── index.ts       # Main Express application
│   │   ├── routes/        # API routes
│   │   └── db/            # Database utilities
│   └── package.json       # Node.js dependencies
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── api/               # Next.js API routes
│   └── globals.css        # Global styles
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
- **Express.js** - Node.js web framework
- **TypeScript** - Type-safe JavaScript
- **Azure SQL Database** - Database
- **OpenAI GPT-4** - AI content generation

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **Shadcn UI** - Component library
- **Tailwind CSS** - Styling
- **jsPDF** - PDF generation

## Setup Instructions

### 1. Backend Setup

#### Install Node Dependencies
```bash
cd backend-ts
npm install
```

#### Configure Environment Variables
```bash
cp .env.example .env
# Edit .env and add your database connection string and API keys
```

Required Environment Variables:
- **DATABASE_URL**: Azure SQL connection string
- **OPENAI_API_KEY**: Get from https://platform.openai.com/

#### Run Backend Server
```bash
cd backend-ts
npm run dev
```

The backend will be available at `http://localhost:8000`

### 2. Frontend Setup

#### Install Node Dependencies
```bash
npm install
```

#### Configure Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local and add your configuration
```

Required Environment Variables:
- **NEXT_PUBLIC_BACKEND_URL**: Backend API URL
- **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY**: Google Maps API key

#### Run Frontend Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Key Features

### Property Management
- Create, edit, delete listings (up to 25 photos)
- Property lifecycle tracking (listing → sold → resell)
- Image compression and upload to Azure Blob Storage
- Google Places Autocomplete for addresses

### AI Features
- Auto-populate property details via AI Vision
- Generate AI selling pitches
- Create social media copy
- Generate Facebook ads

### Property Evaluation
- Multi-stage evaluation process
- Three evaluation modes: Homely, RP Data/Reports, All Data
- PDF export of evaluation reports
- Upload personal RP Data reports

### Data Management
- Property sales data import
- Analytics for growth trends
- List vs. sold price comparison

## API Endpoints Overview

### Properties
- `POST /api/properties` - Create property
- `GET /api/properties` - List properties
- `GET /api/properties/{id}` - Get property details
- `PUT /api/properties/{id}` - Update property
- `DELETE /api/properties/{id}` - Delete property
- `POST /api/properties/{id}/mark-sold` - Mark as sold
- `POST /api/properties/{id}/save-evaluation` - Save evaluation

### Evaluations
- `POST /api/properties/{id}/evaluate` - Run evaluation (Next.js API route)

## Deployment

### Backend (Azure Web App)
The backend is deployed to Azure Web App at `https://propertyval-api.azurewebsites.net`

### Frontend (Azure Static Web Apps)
The frontend is deployed to Azure Static Web Apps

## Troubleshooting

### Dependency Issues
If you encounter peer dependency warnings:
```bash
npm install --legacy-peer-deps
```

### API Key Issues
Ensure all required API keys are set in environment variables.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
