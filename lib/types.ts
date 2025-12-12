// Property types
export interface InclusionItem {
  text: string;
  price: number;
}

// Historical valuation entry
export interface ValuationHistoryEntry {
  date: string;
  estimated_value: number;
  value_low: number;
  value_high: number;
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  data_source: string;
  comparables_count: number;
  notes?: string;
}

// Comparable property with selection state
export interface ComparableProperty {
  id: string;
  address: string;
  price: number;
  beds: number | null;
  baths: number | null;
  carpark: number | null;
  property_type: string;
  sold_date?: string;
  distance_km?: number;
  similarity_score?: number;
  source?: string;
  selected?: boolean; // For manual selection
  land_size?: number | null;
  building_size?: number | null;
}

// Confidence scoring breakdown
export interface ConfidenceScoring {
  overall_score: number; // 0-100
  level: 'high' | 'medium' | 'low';
  factors: {
    comparables_count: { score: number; weight: number; description: string };
    data_recency: { score: number; weight: number; description: string };
    location_match: { score: number; weight: number; description: string };
    property_similarity: { score: number; weight: number; description: string };
    price_consistency: { score: number; weight: number; description: string };
  };
  recommendations: string[];
}

// Suburb market trends
export interface SuburbMarketTrends {
  suburb: string;
  state: string;
  last_updated: string;
  median_price: number;
  median_price_change_12m: number; // percentage
  days_on_market: number;
  days_on_market_change: number;
  auction_clearance_rate: number;
  total_sales_12m: number;
  price_per_sqm: number;
  rental_yield?: number;
  historical_prices: Array<{
    period: string; // e.g., "2024-Q1"
    median_price: number;
    sales_count: number;
  }>;
  property_type_breakdown: Array<{
    type: string;
    median_price: number;
    count: number;
  }>;
}

export interface Property {
  id: string;
  beds: number;
  baths: number;
  carpark: number;
  location: string;
  price?: number | null;
  size?: number | null;
  property_type?: string | null;
  features?: string | null;
  strata_body_corps?: number | null;
  council_rates?: number | null;
  images: string[];
  pitch?: string | null;
  agent1_name?: string | null;
  agent1_phone?: string | null;
  agent2_name?: string | null;
  agent2_phone?: string | null;
  agent_email?: string | null;
  evaluation_report?: string | null;
  evaluation_date?: string | null;
  improvements_detected?: string | null;
  evaluation_ad?: string | null;
  pricing_type?: string | null;
  price_upper?: number | null;
  marketing_strategy?: string | null;
  marketing_package?: string | null;
  marketing_cost?: number | null;
  marketing_report?: string | null;
  marketing_report_date?: string | null;
  rp_data_report?: string | null;
  rp_data_upload_date?: string | null;
  rp_data_filename?: string | null;
  additional_report?: string | null;
  agent_id?: string | null;
  agent_name?: string | null;
  agency_id: string;
  user_email?: string | null;
  created_at: Date;
  status?: 'active' | 'sold' | null;
  sold_price?: number | null;
  sale_date?: string | null;
  comparables_data?: {
    comparable_sold: ComparableProperty[];
    statistics: {
      total_found: number;
      sold_count: number;
      price_range: {
        min: number | null;
        max: number | null;
        avg: number | null;
        median: number | null;
      };
    };
    data_source?: string;
  } | null;
  price_per_sqm?: number | null;
  // New valuation quality fields
  valuation_history?: ValuationHistoryEntry[];
  confidence_scoring?: ConfidenceScoring | null;
  selected_comparables?: string[]; // IDs of manually selected comparables
  suburb_trends?: SuburbMarketTrends | null;
  // Geolocation
  latitude?: number | null;
  longitude?: number | null;
  // Neighbouring suburb for additional comparable sales
  neighbouring_suburb?: string | null;
  neighbouring_postcode?: string | null;
  neighbouring_state?: string | null;
  // Agent productivity fields
  notes?: PropertyNote[];
  is_favourite?: boolean;
  tags?: string[];
}

// Property note/comment
export interface PropertyNote {
  id: string;
  text: string;
  created_at: string;
  created_by: string;
  type?: 'general' | 'call' | 'meeting' | 'offer' | 'follow_up';
}

// Property template for quick creation
export interface PropertyTemplate {
  id: string;
  name: string;
  description?: string;
  property_type: string;
  beds: number;
  baths: number;
  carpark: number;
  features?: string;
  default_agent1_name?: string;
  default_agent1_phone?: string;
  is_system?: boolean; // System templates vs user-created
  created_at: string;
}

export interface PropertyCreate {
  beds: number;
  baths: number;
  carpark: number;
  location: string;
  price?: number | null;
  size?: number | null;
  property_type?: string | null;
  features?: string | null;
  strata_body_corps?: number | null;
  council_rates?: number | null;
  images?: string[];
  agent1_name?: string | null;
  agent1_phone?: string | null;
  agent2_name?: string | null;
  agent2_phone?: string | null;
  agent_email?: string | null;
  user_email?: string | null;
  neighbouring_suburb?: string | null;
  neighbouring_postcode?: string | null;
  neighbouring_state?: string | null;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  agency_id: string;
  agency_name: string;
  bio?: string | null;
  specialties: string[];
  created_at: Date;
}

// Marketing Package types
export interface MarketingPackage {
  id: string;
  name: string;
  price: number;
  inclusions: InclusionItem[];
  description?: string | null;
  order: number;
  active: boolean;
  created_at: Date;
}

// Market Context types
export interface MarketContext {
  id: string;
  rba_interest_rate: number;
  housing_shortage_national: number;
  housing_shortage_nsw: number;
  housing_shortage_vic: number;
  housing_shortage_qld: number;
  housing_shortage_wa: number;
  housing_shortage_sa: number;
  annual_growth_rate_min: number;
  annual_growth_rate_max: number;
  net_migration: number;
  construction_shortfall: number;
  rental_vacancy_rate: number;
  auction_clearance_rate: number;
  days_on_market: number;
  scarcity_premium_min: number;
  scarcity_premium_max: number;
  last_updated: Date;
  updated_by: string;
}
