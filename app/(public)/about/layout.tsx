import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About PropertyEval | Fast & Affordable Property Valuations Australia',
  description: 'Learn about PropertyEval - Australia\'s leading platform for fast, cheap and accurate property valuations. We provide instant valuation reports with historic sales prices and comparable sales data for real estate professionals.',
  keywords: [
    'about PropertyEval',
    'property valuation company Australia',
    'fast property valuations',
    'cheap property valuations',
    'accurate property valuations',
    'Australian property valuation service',
    'real estate valuation platform',
    'property appraisal Australia',
    'valuation report generator',
    'historic sales data provider',
  ],
  openGraph: {
    title: 'About PropertyEval | Fast & Affordable Property Valuations',
    description: 'Australia\'s leading platform for fast, cheap and accurate property valuations with instant report generation and historic sales data.',
    url: 'https://propertyeval.com.au/about',
  },
  alternates: {
    canonical: 'https://propertyeval.com.au/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
