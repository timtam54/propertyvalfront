'use client';

import { useRouter } from 'next/navigation';
import { Home, TrendingUp, FileText, Check, ArrowRight, BarChart3, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-8 h-8 text-cyan-500" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">PropertyPitch</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-5 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          AI-Powered Property Valuations
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Professional Property<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-emerald-500">
            Valuations Made Simple
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
          Get accurate property valuations using AI analysis, comparable sales data, and market insights.
          Perfect for agents, investors, and property professionals.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push('/login')}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push('/quick-evaluation')}
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors"
          >
            Try Quick Valuation
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Photo Analysis</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Our AI analyzes property photos to detect renovations, improvements, and quality factors that affect value.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Comparable Sales</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Access recent sales data from your area to benchmark valuations against real market transactions.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">PDF Reports</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Generate professional valuation reports with market analysis, comparables, and pricing recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Select the tier that fits your valuation needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Tier 1 - Property Valuation */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border-2 border-gray-100 dark:border-gray-700 relative">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Property Valuation</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">AI-powered valuations with market data</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">$29</span>
              <span className="text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                'AI photo analysis for improvements',
                'Access to comparable sales data',
                'Automated valuation reports',
                'PDF export for clients',
                'Up to 20 valuations per month',
                'Email support',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Get Started
            </button>
          </div>

          {/* Tier 2 - Professional */}
          <div className="bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl p-8 shadow-lg relative">
            <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">
              MOST POPULAR
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
              <p className="text-cyan-100 text-sm">Enhanced with RP Data & CoreLogic integration</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$79</span>
              <span className="text-cyan-100">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                'Everything in Property Valuation',
                'Import RP Data reports',
                'Import CoreLogic data',
                'Custom data integration',
                'Enhanced valuation accuracy',
                'Unlimited valuations',
                'Priority support',
                'White-label PDF reports',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-white">
                  <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 bg-white text-cyan-600 font-bold rounded-xl hover:bg-cyan-50 transition-colors"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 sm:p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Trusted by Professionals
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Used by Real Estate Agents Across Australia
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            PropertyPitch helps agents create accurate, professional valuations faster than ever.
            Save hours on research and deliver client-ready reports in minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">5,000+</div>
              <div className="text-sm">Valuations Generated</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">500+</div>
              <div className="text-sm">Active Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">98%</div>
              <div className="text-sm">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to Transform Your Valuations?
          </h2>
          <p className="text-cyan-100 max-w-xl mx-auto mb-8">
            Start your free trial today. No credit card required.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-4 bg-white text-cyan-600 font-bold text-lg rounded-xl hover:bg-cyan-50 transition-colors shadow-lg"
          >
            Get Started Free
          </button>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} PropertyPitch. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
