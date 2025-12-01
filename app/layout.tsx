import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import PWAInstall from "@/components/PWAInstall";
import AuthProvider from "@/components/AuthProvider";
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
  title: "EstatePro - Property Valuation Platform",
  description: "AI-powered property listing and evaluation platform for the Australian market",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EstatePro",
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
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className={`${inter.variable} ${manrope.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
          <PWAInstall />
        </AuthProvider>
      </body>
    </html>
  );
}
