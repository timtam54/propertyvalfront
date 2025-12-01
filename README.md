# EstatePro - Property Listing & Evaluation Platform

A comprehensive real estate platform for property listing, AI-generated selling pitches, and detailed property evaluations built for the Australian market.

## 🎉 Setup Complete!

### ✅ What's Ready
- **Backend**: Full FastAPI backend with MongoDB integration
- **Frontend**: Next.js 16 with Tailwind CSS v4
- **Components**: Custom components ready to use
- **Utilities**: Image compression, PDF generation
- **Styling**: Tailwind CSS v4 with custom utility classes
- **Dependencies**: All installed and working
- **Example Page**: Login page converted to Next.js

## 📂 Project Structure

```
propertyval/
├── backend/                    # ✅ FastAPI backend (READY)
│   ├── server.py              # Main application
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment template
│   └── ...                   # All API endpoints ready
├── app/                       # ⏳ Next.js pages (CONVERT FROM REACT)
│   ├── login/                # ✅ Example converted page
│   │   └── page.tsx
│   ├── page.tsx              # Home page (needs conversion)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # ✅ Tailwind CSS v4 + custom styles
├── components/                # ✅ Custom components
│   ├── GooglePlacesAutocomplete.js
│   ├── FacebookAdPreview.js
│   ├── FacebookPostPreview.js
│   └── ProtectedRoute.js
├── utils/                     # ✅ Helper utilities
│   ├── imageCompression.js
│   └── pdfGenerator.js
├── SETUP.md                  # 📖 Detailed setup guide
├── CONVERSION_GUIDE.md       # 📖 React to Next.js conversion guide
└── .env.local.example        # Environment template
```

## 🚀 Quick Start

### 1. Environment Variables

```bash
# Frontend
cp .env.local.example .env.local
# Add: NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Backend
cd backend
cp .env.example .env
# Add your MongoDB URL, OpenAI key, etc.
```

### 2. Start Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

Backend runs at `http://localhost:8000`

### 3. Start Frontend

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`

## 📋 Next Steps - Convert Pages

Original React pages are in `/tmp/property-app-main/frontend/src/pages/`. Convert them using Tailwind CSS classes.

### Key Pages to Convert

| Priority | Original | New Location | Status |
|----------|----------|--------------|--------|
| **High** | `HomePage.js` | `app/page.tsx` | ⏳ To Do |
| **High** | `PropertyDetail.js` | `app/property/[id]/page.tsx` | ⏳ To Do |
| **High** | `PropertyEvaluation.js` | `app/property/[id]/evaluation/page.tsx` | ⏳ To Do |
| Medium | `QuickEvaluation.js` | `app/quick-evaluation/page.tsx` | ⏳ To Do |
| Low | `Settings.js` | `app/settings/page.tsx` | ⏳ To Do |
| Low | `Login.js` | `app/login/page.tsx` | ✅ **Done** (Example) |
| Medium | Others | See CONVERSION_GUIDE.md | ⏳ To Do |

### Conversion Pattern

**Original React:**
```javascript
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
navigate("/path");
```

**Next.js:**
```typescript
"use client";
import { useRouter } from "next/navigation";
const router = useRouter();
router.push("/path");
```

## 🎨 Styling with Tailwind CSS

This project uses **Tailwind CSS v4** + custom utility classes defined in `app/globals.css`.

### Using Custom Classes

```jsx
// Property card
<div className="property-card">
  <img className="property-image" src={image} alt="Property" />
  <div className="property-content">
    <h3 className="property-location">{location}</h3>
    <p className="property-price">${price}</p>
  </div>
</div>

// Forms
<div className="form-group">
  <label className="form-label">Property Address</label>
  <input className="form-input" type="text" />
</div>

// Buttons
<button className="submit-btn">Save Property</button>
<button className="cancel-btn">Cancel</button>
```

### Available Custom Classes

See `app/globals.css` for all available classes:
- `.property-card`, `.property-image`, `.property-content`
- `.form-input`, `.form-label`, `.form-group`
- `.submit-btn`, `.cancel-btn`, `.action-btn`
- `.header`, `.logo`, `.main-content`
- And many more...

### Using Tailwind Utilities

```jsx
<div className="flex items-center gap-4 p-6 rounded-lg shadow-lg bg-white">
  <h1 className="text-2xl font-bold text-gray-900">Property Title</h1>
</div>
```

## 🔑 Required API Keys

- **MongoDB** - Database (local or Atlas)
- **OpenAI** - AI content generation
- **Google Maps** - Address autocomplete
- **Domain.com.au** - Property data
- **Stripe** - Payment processing (optional)

## 🛠️ Tech Stack

### Backend
- FastAPI, MongoDB, OpenAI GPT-4, Stripe, Domain API

### Frontend
- Next.js 16, React 19, **Tailwind CSS v4**, Axios, jsPDF, Lucide Icons, Sonner (toasts)

## ✨ Key Features

- 🏠 Property management (CRUD operations)
- 🤖 AI-generated selling pitches & social media content
- 📊 Detailed property evaluations with multiple data sources
- 📈 Market analytics and growth trends
- 💳 Stripe subscription integration
- 📁 Portfolio import for agents
- 🗂️ Sales data management

## 🐛 Troubleshooting

### Build Works But No Tailwind Styles?
- Make sure `app/globals.css` has `@import "tailwindcss";` at the top
- Restart dev server: `Ctrl+C` then `npm run dev`

### "Module not found" Errors?
- Check imports use `@/` prefix: `import Component from "@/components/Component"`
- Verify file exists in the correct location

### API Calls Failing?
- Check `.env.local` has `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`
- Restart dev server after changing env variables
- Make sure backend is running on port 8000

## 📝 Example: Login Page

Check `app/login/page.tsx` for a complete Next.js example with:
- ✅ "use client" directive
- ✅ Next.js routing with `useRouter`
- ✅ Inline styles (you can replace with Tailwind classes)
- ✅ Form handling and API calls
- ✅ Toast notifications

## 📚 Documentation

- **SETUP.md** - Detailed backend/frontend setup, API endpoints, features
- **CONVERSION_GUIDE.md** - Step-by-step React to Next.js conversion
- **backend/.env.example** - All required backend environment variables

## 🎯 Current Status

✅ **Backend**: Fully configured, ready to run
✅ **Frontend**: Next.js + Tailwind CSS v4 working
✅ **Dependencies**: All installed (simplified, no Shadcn)
✅ **Build**: Compiles successfully
⏳ **Pages**: Need conversion from React
⏳ **Testing**: After page conversion

## 🚢 Deployment

1. **Frontend**: Deploy to Vercel (automatic for Next.js)
2. **Backend**: Deploy to Railway, Render, or AWS
3. **Database**: Use MongoDB Atlas (cloud)

## 📞 Support

- Original app: [Emergent.sh](https://app.emergent.sh/)
- Next.js: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- FastAPI: https://fastapi.tiangolo.com/

---

**Ready to build!** 🚀
Start the backend, then `npm run dev`, and convert pages using `app/login/page.tsx` as your guide!
