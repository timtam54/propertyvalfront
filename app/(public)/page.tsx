'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { Home, TrendingUp, FileText, Check, X, ArrowRight, BarChart3, Shield, Zap, Star, Quote, MapPin, Building, Users, Clock, LogIn } from 'lucide-react';

// JSON-LD structured data for SEO
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PropertyPitch',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description: 'AI-powered property valuation and market valuation platform with Facebook post generation for real estate marketing. Get accurate property valuations, comparable sales analysis, and create engaging social media content for property listings.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'AUD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
  },
  provider: {
    '@type': 'Organization',
    name: 'PropertyPitch',
    url: 'https://propertyval-web.azurewebsites.net',
  },
  featureList: [
    'AI-Powered Property Valuation',
    'Market Valuation Analysis',
    'Comparable Sales Data',
    'Facebook Post Generation',
    'Social Media Marketing Tools',
    'Professional PDF Reports',
    'Real Estate Market Analysis',
    'Property Investment Analytics'
  ],
  keywords: 'property valuation, market valuation, Facebook property posts, real estate marketing, AI valuation, property appraisal, house valuation, real estate Facebook marketing'
};

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let startTime: number;
          const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeOutQuart * end));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return (
    <div ref={ref} className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
      {count.toLocaleString()}{suffix}
    </div>
  );
}

// Testimonial data
const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Senior Real Estate Agent",
    company: "Ray White Brisbane",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    quote: "PropertyPitch has completely transformed how I prepare valuations. What used to take hours now takes minutes, and my clients are impressed with the professional reports.",
    rating: 5
  },
  {
    name: "James Chen",
    role: "Property Investor",
    company: "Chen Property Group",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    quote: "The AI photo analysis is incredible. It picks up on renovation details I might miss and factors them into the valuation. Essential tool for any serious investor.",
    rating: 5
  },
  {
    name: "Emma Thompson",
    role: "Principal Agent",
    company: "LJ Hooker Sydney",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    quote: "The comparable sales data is always up-to-date and the RP Data integration saves me from switching between multiple platforms. Highly recommend!",
    rating: 5
  }
];

// Feature comparison data
const featureComparison = [
  { feature: "AI Photo Analysis", basic: true, pro: true },
  { feature: "Comparable Sales Data", basic: true, pro: true },
  { feature: "PDF Valuation Reports", basic: true, pro: true },
  { feature: "Monthly Valuations", basic: "20", pro: "Unlimited" },
  { feature: "RP Data Integration", basic: false, pro: true },
  { feature: "CoreLogic Integration", basic: false, pro: true },
  { feature: "White-label Reports", basic: false, pro: true },
  { feature: "Custom Branding", basic: false, pro: true },
  { feature: "API Access", basic: false, pro: true },
  { feature: "Priority Support", basic: false, pro: true },
  { feature: "Team Collaboration", basic: false, pro: true },
];

// Property showcase images
const showcaseProperties = [
  {
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop",
    price: "$1,250,000",
    location: "Paddington, QLD",
    beds: 4,
    baths: 2
  },
  {
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
    price: "$890,000",
    location: "Newstead, QLD",
    beds: 3,
    baths: 2
  },
  {
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop",
    price: "$2,100,000",
    location: "Teneriffe, QLD",
    beds: 5,
    baths: 3
  }
];

export default function HomePage() {
  const router = useRouter();
  const [currentShowcase, setCurrentShowcase] = useState(0);

  // Auto-rotate showcase
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentShowcase((prev) => (prev + 1) % showcaseProperties.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* JSON-LD Structured Data for SEO */}
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-gray-800 dark:to-gray-800 border-b border-cyan-700 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-8 h-8 text-white dark:text-cyan-500" />
            <span className="text-xl font-bold text-white dark:text-cyan-500">PropertyPitch</span>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 px-5 py-2 bg-white text-cyan-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section with Property Showcase */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left">
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
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8">
              Get accurate property valuations and market analysis using AI. Generate Facebook posts and professional marketing content.
              Perfect for agents, investors, and property professionals.
            </p>
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
              <button
                onClick={() => router.push('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/quick-evaluation')}
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all hover:shadow-md"
              >
                Try Quick Valuation
              </button>
            </div>
          </div>

          {/* Right: Property Showcase */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              {/* Main Property Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {showcaseProperties.map((property, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      index === currentShowcase ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <img
                      src={property.image}
                      alt={property.location}
                      className="w-full h-full object-cover"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Property Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <div className="flex items-center gap-2 text-cyan-300 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        {property.location}
                      </div>
                      <div className="text-3xl font-bold mb-2">{property.price}</div>
                      <div className="flex items-center gap-4 text-sm text-gray-300">
                        <span>{property.beds} beds</span>
                        <span>{property.baths} baths</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Analysis Badge */}
              <div className="absolute top-4 right-4 px-4 py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Analyzing</span>
                </div>
              </div>
            </div>

            {/* Showcase Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {showcaseProperties.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentShowcase(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentShowcase
                      ? 'bg-cyan-500 w-8'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            {/* Floating Stats Card */}
            <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 border border-gray-100 dark:border-gray-700 hidden sm:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg. Time Saved</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">3.5 hours</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="bg-white dark:bg-gray-800 py-16 border-y border-gray-100 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <AnimatedCounter end={5000} suffix="+" />
              <div className="text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Valuations Generated
              </div>
            </div>
            <div className="text-center">
              <AnimatedCounter end={500} suffix="+" />
              <div className="text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Active Agents
              </div>
            </div>
            <div className="text-center">
              <AnimatedCounter end={98} suffix="%" />
              <div className="text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
                <Star className="w-4 h-4" />
                Satisfaction Rate
              </div>
            </div>
            <div className="text-center">
              <AnimatedCounter end={35} suffix="min" />
              <div className="text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Avg. Report Time
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features for Professionals
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to create accurate, professional property valuations
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Photo Analysis</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Our AI analyzes property photos to detect renovations, improvements, and quality factors that affect value.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Comparable Sales</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Access recent sales data from your area to benchmark valuations against real market transactions.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">PDF Reports</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Generate professional valuation reports with market analysis, comparables, and pricing recommendations.
            </p>
          </div>
        </div>

        {/* Second row of features */}
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Facebook Marketing</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Generate engaging Facebook posts and social media content for your property listings with AI-powered copywriting.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Market Valuation</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get comprehensive market valuation insights with suburb trends, growth forecasts, and investment potential analysis.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Mobile App</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Access property valuations on-the-go with our web and mobile app. Perfect for agents in the field.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gradient-to-br from-cyan-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Industry Professionals
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              See what real estate agents are saying about PropertyPitch
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative"
              >
                {/* Quote Icon */}
                <Quote className="absolute top-4 right-4 w-8 h-8 text-cyan-100 dark:text-cyan-900" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                    <div className="text-xs text-cyan-600 dark:text-cyan-400">{testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing with Feature Comparison Table */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Select the tier that fits your valuation needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Tier 1 - Property Valuation */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border-2 border-gray-100 dark:border-gray-700 relative hover:border-cyan-200 dark:hover:border-cyan-800 transition-colors">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Property Valuation</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">AI-powered valuations with market data</p>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold text-gray-900 dark:text-white">$29</span>
              <span className="text-gray-600 dark:text-gray-400">/month</span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mb-4"
            >
              Get Started
            </button>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400">14-day free trial included</p>
          </div>

          {/* Tier 2 - Professional */}
          <div className="bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl p-8 shadow-lg relative transform hover:scale-[1.02] transition-transform">
            <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">
              MOST POPULAR
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
              <p className="text-cyan-100 text-sm">Enhanced with RP Data & CoreLogic integration</p>
            </div>
            <div className="mb-6">
              <span className="text-5xl font-bold text-white">$79</span>
              <span className="text-cyan-100">/month</span>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 bg-white text-cyan-600 font-bold rounded-xl hover:bg-cyan-50 transition-colors mb-4"
            >
              Start Free Trial
            </button>
            <p className="text-sm text-center text-cyan-100">14-day free trial included</p>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden max-w-4xl mx-auto">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">
              Feature Comparison
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">Property Valuation</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 dark:text-gray-400 bg-cyan-50 dark:bg-cyan-900/20">Professional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {featureComparison.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {typeof row.basic === 'boolean' ? (
                        row.basic ? (
                          <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{row.basic}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center bg-cyan-50/50 dark:bg-cyan-900/10">
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? (
                          <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">{row.pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 opacity-60">
            <div className="flex items-center gap-2 text-gray-400">
              <Building className="w-5 h-5" />
              <span className="font-semibold">Ray White</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Building className="w-5 h-5" />
              <span className="font-semibold">LJ Hooker</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Building className="w-5 h-5" />
              <span className="font-semibold">McGrath</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Building className="w-5 h-5" />
              <span className="font-semibold">Century 21</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to Transform Your Valuations?
            </h2>
            <p className="text-cyan-100 max-w-xl mx-auto mb-8">
              Start your free trial today. No credit card required.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-white text-cyan-600 font-bold text-lg rounded-xl hover:bg-cyan-50 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              Get Started Free
            </button>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} PropertyPitch. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
