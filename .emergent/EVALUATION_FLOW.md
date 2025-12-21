# Property Evaluation Flow - CRITICAL REQUIREMENTS

## Overview

The evaluation page displays historic property sales and generates AI valuations. **THE AI VALUATION MUST ONLY USE THE EXACT SAME SALES SHOWN IN THE HISTORIC PROPERTY SALES CARD.**

## Data Flow (How It MUST Work)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: HistoricSalesCard fetches and displays sales                       │
│                                                                              │
│  /api/properties/[id]/historic-sales → scrapes Homely → returns sales       │
│  HistoricSalesCard processes with similarity scores & distance              │
│  User sees: "1/5 Rose Street (0m, 100% match)"                              │
│             "5/128 Eyre Street (300m, 100% match)"                          │
│             "6/157 Mitchell Street (395m, 100% match)"                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: HistoricSalesCard calls onSalesProcessed callback                  │
│                                                                              │
│  The TOP sales (sorted by similarity) are passed to the parent page         │
│  via: onSalesProcessed={setHistoricSalesData}                               │
│                                                                              │
│  This stores the EXACT SAME sales in historicSalesData state                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: User clicks "Evaluate Property"                                    │
│                                                                              │
│  evaluateProperty() sends POST to /api/properties/[id]/evaluate with:       │
│  {                                                                           │
│    historicSales: historicSalesData  // THE EXACT SAME SALES FROM STEP 1   │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: Evaluate API uses ONLY the passed historicSales                    │
│                                                                              │
│  if (requestBody.historicSales && requestBody.historicSales.length > 0) {   │
│    // USE THESE - DO NOT SCRAPE AGAIN                                       │
│    soldProperties = requestBody.historicSales.map(...)                      │
│  }                                                                           │
│                                                                              │
│  The AI prompt receives these EXACT sales as comparables                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: AI generates valuation using THOSE EXACT SALES                     │
│                                                                              │
│  The valuation report should reference:                                     │
│  - 1/5 Rose Street ($379,000)    ← SAME AS HISTORIC CARD SHOWED             │
│  - 5/128 Eyre Street ($390,000)  ← SAME AS HISTORIC CARD SHOWED             │
│  - 6/157 Mitchell Street ($265,000) ← SAME AS HISTORIC CARD SHOWED          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `/app/property/[id]/evaluation/page.tsx` | Main evaluation page |
| `/components/HistoricSalesCard.tsx` | Displays historic sales, passes to parent |
| `/app/api/properties/[propertyId]/evaluate/route.ts` | Generates AI valuation |
| `/app/api/properties/[propertyId]/historic-sales/route.ts` | Fetches sales from Homely |

## CRITICAL RULES

1. **NO INDEPENDENT SCRAPING IN EVALUATE API**: The evaluate endpoint must NOT scrape its own data. It must ONLY use what's passed in `requestBody.historicSales`.

2. **TOP 3 BEST MATCHES**: The AI valuation should prominently feature the top 3 best matches from the Historic Sales Card (sorted by similarity score).

3. **SAME DATA EVERYWHERE**: What the user sees in the Historic Sales Card MUST be EXACTLY what the AI uses for valuation. No exceptions.

4. **WAIT FOR WEIGHTS**: The HistoricSalesCard must wait for weights to load before calling `onSalesProcessed`, otherwise similarity scores will be wrong.

## Current Bug (If Sales Don't Match)

If the AI valuation shows DIFFERENT sales than the Historic Sales Card, check:

1. **Is `historicSalesData` empty when evaluate is called?**
   - The callback might fire before data is ready
   - Check console for: `[EvaluatePage] Sending X historic sales to API`

2. **Is the API falling back to scraping?**
   - Check server logs for: `[Evaluate] No pre-calculated data - scraping fresh`
   - This means the frontend didn't pass the data

3. **Is `weightsLoaded` set before callback fires?**
   - The similarity calculation needs weights
   - Check: `[HistoricSalesCard] Passing X processed sales to parent`

## Expected Console Logs (When Working Correctly)

```
[HistoricSalesCard] Passing 30 processed sales to parent
[EvaluatePage] Sending 30 historic sales to API
  1. 1/5 Rose Street, North Ward QLD 4810 - $379000 - 100% match - 0km
  2. 5/128 Eyre Street, North Ward QLD 4810 - $390000 - 100% match - 0.3km
  3. 6/157 Mitchell Street, North Ward QLD 4810 - $265000 - 100% match - 0.395km
[Evaluate] Using 30 pre-calculated sales from frontend
[Evaluate] Top 3 matches:
  1. 1/5 Rose Street, North Ward QLD 4810 - $379,000 (2bed/1bath) - 100% match
  2. 5/128 Eyre Street, North Ward QLD 4810 - $390,000 (2bed/1bath) - 100% match
  3. 6/157 Mitchell Street, North Ward QLD 4810 - $265,000 (2bed/1bath) - 100% match
```
