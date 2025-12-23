import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PropertyPitch - AI-Powered Property Valuation & Real Estate Analytics',
  description: 'Get accurate property valuations powered by AI. PropertyPitch helps real estate agents and property investors with market analysis, comparable sales data, and professional property pitches.',
  keywords: [
    'property valuation',
    'real estate analytics',
    'AI property valuation',
    'comparable sales',
    'property investment',
    'real estate agent tools',
    'property pitch',
    'market analysis',
    'Australian property',
    'real estate software'
  ],
  authors: [{ name: 'PropertyPitch' }],
  creator: 'PropertyPitch',
  publisher: 'PropertyPitch',
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
    url: 'https://propertyval-web.azurewebsites.net',
    siteName: 'PropertyPitch',
    title: 'PropertyPitch - AI-Powered Property Valuation & Real Estate Analytics',
    description: 'Get accurate property valuations powered by AI. Comprehensive market analysis, comparable sales data, and professional property pitches for real estate professionals.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PropertyPitch - AI Property Valuation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PropertyPitch - AI-Powered Property Valuation',
    description: 'Get accurate property valuations powered by AI. Market analysis & comparable sales for real estate professionals.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'your-google-verification-code', // Replace with actual verification code
  },
  alternates: {
    canonical: 'https://propertyval-web.azurewebsites.net',
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
