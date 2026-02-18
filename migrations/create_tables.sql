-- VA Claim Navigator Database Schema Migration
-- This script creates all required tables for the Insforge database

-- Create enum types
CREATE TYPE subscription_tier AS ENUM ('starter', 'pro', 'deluxe', 'business');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE claim_status AS ENUM ('draft', 'in_progress', 'submitted', 'approved', 'denied');
CREATE TYPE buddy_statement_status AS ENUM ('pending', 'completed', 'sent');
CREATE TYPE referral_status AS ENUM ('pending', 'registered', 'claimed_filed', 'rewarded');
CREATE TYPE consultation_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE consultation_type AS ENUM ('initial_rating', 'rating_increase', 'appeal_strategy', 'general_guidance');
CREATE TYPE appeal_type AS ENUM ('supplemental', 'higher_level_review', 'board_appeal');
CREATE TYPE appeal_status AS ENUM ('draft', 'submitted', 'pending', 'approved', 'denied');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  avatar_url TEXT,
  va_id TEXT,
  subscription_tier subscription_tier DEFAULT 'starter' NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
  profile_completed BOOLEAN DEFAULT false NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  ssn TEXT,
  va_file_number TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Service History table
CREATE TABLE IF NOT EXISTS service_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  component TEXT NOT NULL,
  date_entered TIMESTAMP NOT NULL,
  date_separated TIMESTAMP,
  mos TEXT,
  deployments JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Medical Conditions table
CREATE TABLE IF NOT EXISTS medical_conditions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  diagnosed_date TIMESTAMP,
  provider TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  status claim_status DEFAULT 'draft' NOT NULL,
  date_of_onset TIMESTAMP,
  severity TEXT,
  symptoms JSONB,
  service_connection_type TEXT,
  incident_details TEXT,
  functional_impact TEXT,
  completion_percentage INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Lay Statements table
CREATE TABLE IF NOT EXISTS lay_statements (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_id VARCHAR REFERENCES claims(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Buddy Statements table
CREATE TABLE IF NOT EXISTS buddy_statements (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_id VARCHAR REFERENCES claims(id) ON DELETE CASCADE,
  buddy_name TEXT NOT NULL,
  buddy_email TEXT NOT NULL,
  relationship TEXT NOT NULL,
  condition_description TEXT NOT NULL,
  status buddy_statement_status DEFAULT 'pending' NOT NULL,
  content TEXT,
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_id VARCHAR REFERENCES claims(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_email TEXT,
  referred_user_id VARCHAR REFERENCES users(id),
  status referral_status DEFAULT 'pending' NOT NULL,
  reward_amount INTEGER DEFAULT 0,
  reward_paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  converted_at TIMESTAMP
);

-- Consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  consultation_type consultation_type NOT NULL,
  current_rating TEXT,
  branch_of_service TEXT,
  discharge_type TEXT,
  scheduled_date TIMESTAMP NOT NULL,
  scheduled_time TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  status consultation_status DEFAULT 'scheduled' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Appeals table
CREATE TABLE IF NOT EXISTS appeals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_id VARCHAR REFERENCES claims(id) ON DELETE CASCADE,
  type appeal_type NOT NULL,
  status appeal_status DEFAULT 'draft' NOT NULL,
  reason TEXT NOT NULL,
  new_evidence TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Site Stats table
CREATE TABLE IF NOT EXISTS site_stats (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL UNIQUE,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_history_user_id ON service_history(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_conditions_user_id ON medical_conditions(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);
CREATE INDEX IF NOT EXISTS idx_lay_statements_user_id ON lay_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_lay_statements_claim_id ON lay_statements(claim_id);
CREATE INDEX IF NOT EXISTS idx_buddy_statements_user_id ON buddy_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_buddy_statements_claim_id ON buddy_statements(claim_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_claim_id ON documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_user_id ON appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_claim_id ON appeals(claim_id);
CREATE INDEX IF NOT EXISTS idx_site_stats_key ON site_stats(key);

-- Initialize site_stats with default value
INSERT INTO site_stats (key, value) VALUES ('vets_served', 526)
ON CONFLICT (key) DO NOTHING;

-- Optional: if users table already existed without ssn/va_file_number, run in Insforge SQL editor:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS ssn TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS va_file_number TEXT;
