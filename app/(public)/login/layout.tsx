import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | PropertyEval - Property Valuation & Market Analysis Platform',
  description: 'Sign in to PropertyEval to access AI-powered property valuation, market valuation tools, and Facebook post generation for real estate marketing. Create professional property valuations and engaging social media content.',
  keywords: [
    'property valuation login',
    'real estate agent login',
    'property valuation platform',
    'market valuation tool',
    'Facebook property marketing',
    'real estate software login',
    'property appraisal tool',
    'AI property valuation',
    'real estate valuation sign in',
    'property pitch login'
  ],
  openGraph: {
    title: 'Sign In | PropertyEval - Property Valuation Platform',
    description: 'Access your PropertyEval account for AI-powered property valuations, market analysis, and Facebook marketing tools.',
    url: 'https://propertyval-web.azurewebsites.net/login',
    siteName: 'PropertyEval',
    type: 'website',
    locale: 'en_AU',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PropertyEval Login - Property Valuation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In | PropertyEval - Property Valuation',
    description: 'Access AI-powered property valuations and Facebook marketing tools for real estate professionals.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://propertyval-web.azurewebsites.net/login',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
