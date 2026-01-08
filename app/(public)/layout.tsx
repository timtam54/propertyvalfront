import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fast & Accurate Property Valuations Australia | Cheap Valuation Reports | PropertyEval',
  description: 'Get fast, accurate and affordable property valuations in Australia. Generate professional valuation reports instantly with historic sales prices, comparable sales data and AI-powered market analysis. Trusted by real estate agents nationwide.',
  keywords: [
    // Primary keywords - user specified
    'fast property valuations',
    'cheap property valuations',
    'accurate property valuations',
    'property valuation report',
    'valuation report generation',
    'historic sales prices',
    'historic property sales',
    // Location-based
    'property valuation Australia',
    'Australian property valuation',
    'property valuation Brisbane',
    'property valuation Sydney',
    'property valuation Melbourne',
    // Service keywords
    'instant property valuation',
    'online property valuation',
    'free property valuation',
    'property appraisal online',
    'house valuation report',
    'home valuation Australia',
    'real estate valuation report',
    // Feature keywords
    'comparable sales data',
    'property sales history',
    'suburb sales data',
    'property market analysis',
    'AI property valuation',
    'automated property valuation',
    // Professional keywords
    'real estate agent tools',
    'property valuation software',
    'valuation report generator',
    'professional property reports',
    // Marketing keywords
    'Facebook property posts',
    'real estate marketing',
    'property listing marketing',
    'social media property marketing'
  ],
  authors: [{ name: 'PropertyEval' }],
  creator: 'PropertyEval',
  publisher: 'PropertyEval',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://propertyeval.com.au',
    siteName: 'PropertyEval',
    title: 'Fast & Accurate Property Valuations Australia | Instant Valuation Reports',
    description: 'Get fast, cheap and accurate property valuations with instant report generation. Access historic sales prices and comparable sales data. Trusted by Australian real estate professionals.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PropertyEval - Fast & Accurate Property Valuations Australia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fast & Accurate Property Valuations | Historic Sales Data | PropertyEval',
    description: 'Instant property valuations with historic sales prices. Generate professional valuation reports in minutes. Affordable pricing for Australian real estate professionals.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'googlecdf451f535300ddf',
  },
  alternates: {
    canonical: 'https://propertyeval.com.au',
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
