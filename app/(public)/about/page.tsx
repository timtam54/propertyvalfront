'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Home, Users, Target, Award, MapPin, Mail, Phone, LogIn, Info, Menu, X } from 'lucide-react';

export default function AboutPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-gray-800 dark:to-gray-800 border-b border-cyan-700 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-8 h-8 text-white dark:text-cyan-500" />
            <span className="text-xl font-bold text-white dark:text-cyan-500">PropertyPitch</span>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-white/80 hover:text-white transition-colors font-medium">
              Home
            </Link>
            <Link href="/about" className="text-white font-medium">
              About
            </Link>
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 px-5 py-2 bg-white text-cyan-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </nav>
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-cyan-700 dark:bg-gray-800 border-t border-cyan-600 dark:border-gray-700">
            <nav className="flex flex-col p-4 gap-2">
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5" />
                Home
              </Link>
              <Link
                href="/about"
                className="flex items-center gap-3 px-4 py-3 text-white bg-white/10 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Info className="w-5 h-5" />
                About
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full text-sm font-medium mb-6">
          <Info className="w-4 h-4" />
          About PropertyPitch
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Transforming Property Valuations<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-emerald-500">
            With AI Technology
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          PropertyPitch is an Australian-built platform designed to help real estate professionals
          create accurate, professional property valuations faster than ever before.
        </p>
      </section>

      {/* Mission Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Mission</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We believe that property professionals deserve better tools. Traditional valuation methods
              are time-consuming, often requiring hours of research across multiple platforms.
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              PropertyPitch combines artificial intelligence, comprehensive market data, and intuitive
              design to deliver professional-grade valuations in minutes, not hours.
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Our goal is simple: empower agents, investors, and property professionals with the
              tools they need to make informed decisions and deliver exceptional service to their clients.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">5,000+</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Valuations Generated</div>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">500+</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Active Users</div>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">98%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Satisfaction Rate</div>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">AU</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Australia Wide</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="bg-white dark:bg-gray-800 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12 text-center">What We Offer</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our AI analyses property photos to detect renovations, quality factors, and features that impact value.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Market Data Integration</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Access comprehensive sales data, suburb trends, and market insights from trusted Australian sources.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Professional Reports</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Generate client-ready PDF reports with detailed analysis, comparables, and market commentary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Get In Touch</h2>
          <p className="text-cyan-100 max-w-xl mx-auto mb-8">
            Have questions about PropertyPitch? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="mailto:support@propertyeval.com.au" className="flex items-center gap-2 text-white hover:text-cyan-100 transition-colors">
              <Mail className="w-5 h-5" />
              support@propertyeval.com.au
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-cyan-500" />
              <span className="font-semibold text-gray-900 dark:text-white">PropertyPitch</span>
            </div>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Home
              </Link>
              <Link href="/about" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                About
              </Link>
              <Link href="/login" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Login
              </Link>
            </nav>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} PropertyPitch. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
