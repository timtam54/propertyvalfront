// Property types
export interface InclusionItem {
  text: string;
  price: number;
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
    comparable_sold: Array<{
      address: string;
      price: number;
      beds: number | null;
      baths: number | null;
      carpark: number | null;
      property_type: string;
      sold_date?: string;
    }>;
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
  } | null;
  price_per_sqm?: number | null;
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
