# EstatePro - Property Listing & Evaluation Platform

A comprehensive real estate platform for property listing, AI-generated selling pitches, and detailed property evaluations built for the Australian market.

## Tech Stack

- **Frontend**: Next.js 16 with React 19, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with TypeScript
- **Database**: Azure SQL Database
- **Storage**: Azure Blob Storage
- **AI**: OpenAI GPT-4

## Project Structure

```
propertyval/
├── backend-ts/                 # TypeScript/Express backend
│   ├── src/
│   │   ├── index.ts           # Main Express application
│   │   ├── routes/            # API routes
│   │   └── db/                # Database utilities
│   └── package.json
├── app/                        # Next.js app directory
│   ├── api/                   # Next.js API routes
│   ├── (auth)/                # Authenticated pages
│   ├── (public)/              # Public pages
│   └── layout.tsx             # Root layout
├── components/                 # React components
├── utils/                      # Helper utilities
└── lib/                        # Shared libraries
```

## Quick Start

### 1. Environment Variables

```bash
# Frontend
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Backend
cd backend-ts
cp .env.example .env
# Edit .env with your database connection string
```

### 2. Start Backend

```bash
cd backend-ts
npm install
npm run dev
```

Backend runs at `http://localhost:8000`

### 3. Start Frontend

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

## Key Features

- **Property Management**: Create, edit, and manage property listings
- **AI Evaluations**: Three evaluation modes - Homely, RP Data/Reports, All Data
- **PDF Reports**: Generate professional evaluation reports
- **Image Management**: Upload and manage property photos via Azure Blob Storage

## Deployment

- **Backend**: Azure Web App (`https://propertyval-api.azurewebsites.net`)
- **Frontend**: Azure Static Web Apps

## Documentation

See `SETUP.md` for detailed setup instructions.
