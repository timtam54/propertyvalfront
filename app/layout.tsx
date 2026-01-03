import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import PWAInstall from "@/components/PWAInstall";
import AuthProvider from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://propertyval-web.azurewebsites.net"),
  title: {
    default: "PropertyPitch - AI Property Valuation & Facebook Marketing",
    template: "%s | PropertyPitch"
  },
  description: "AI-powered property valuation platform with market analysis, comparable sales, and Facebook post generation. Get accurate property valuations and create engaging social media marketing content for real estate listings.",
  manifest: "/manifest.json",
  keywords: [
    "property valuation",
    "market valuation",
    "AI property valuation",
    "Facebook property posts",
    "real estate marketing",
    "property appraisal",
    "Australian property valuation",
    "real estate Facebook marketing",
    "property market analysis",
    "comparable sales data"
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PropertyPitch",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "PropertyPitch",
    title: "PropertyPitch - AI Property Valuation & Facebook Marketing",
    description: "Get accurate property valuations and generate engaging Facebook posts for your real estate listings with AI-powered analysis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PropertyPitch - AI Property Valuation",
    description: "Property valuation, market analysis & Facebook marketing for real estate professionals.",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
            <PWAInstall />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
