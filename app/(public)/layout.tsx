import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PropertyPitch - AI Property Valuation | Market Analysis & Facebook Marketing',
  description: 'Professional property valuation platform with AI-powered market valuation, comparable sales data, and Facebook post generation for real estate marketing. Get accurate valuations and create engaging social media content for your property listings.',
  keywords: [
    'property valuation',
    'market valuation',
    'property valuation Australia',
    'real estate valuation',
    'AI property valuation',
    'property market analysis',
    'Facebook property posts',
    'real estate Facebook marketing',
    'property social media marketing',
    'Facebook real estate ads',
    'property listing posts',
    'comparable sales',
    'property investment',
    'real estate agent tools',
    'property pitch',
    'Australian property valuation',
    'real estate software',
    'property appraisal',
    'house valuation',
    'home valuation',
    'property value estimate',
    'real estate market analysis',
    'property marketing',
    'social media property marketing'
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
    title: 'PropertyPitch - AI Property Valuation | Market Analysis & Facebook Marketing',
    description: 'Professional property valuation with AI-powered market analysis. Generate accurate valuations and create engaging Facebook posts for your real estate listings. Trusted by Australian agents.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PropertyPitch - AI Property Valuation & Facebook Marketing Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PropertyPitch - AI Property Valuation & Market Analysis',
    description: 'Get accurate property valuations powered by AI. Market valuation, comparable sales & Facebook marketing for real estate professionals.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'googlecdf451f535300ddf',
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
