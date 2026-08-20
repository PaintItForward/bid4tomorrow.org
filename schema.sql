-- schema.sql
-- Paint It Forward Auction Database Schema
-- PostgreSQL

-- Enable UUID generation if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'bidder',          -- 'bidder' or 'admin'
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- ARTISTS
-- ─────────────────────────────────────────────
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  school_region TEXT,
  bio TEXT,
  parent_guardian_name TEXT,
  parent_guardian_email TEXT,
  agreement_status TEXT DEFAULT 'pending',      -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- ARTWORKS
-- ─────────────────────────────────────────────
CREATE TABLE artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  artist_statement TEXT,
  medium TEXT,
  dimensions TEXT,
  year INTEGER,
  image_url TEXT,
  starting_bid NUMERIC(10,2) NOT NULL,
  min_increment NUMERIC(10,2) NOT NULL DEFAULT 5,
  auction_start TIMESTAMPTZ,
  auction_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',         -- 'draft', 'pending_approval', 'scheduled', 'live', 'closed', 'payment_pending', 'sold', 'withdrawn', 'physical_auction'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- BIDS
-- ─────────────────────────────────────────────
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',        -- 'active', 'outbid', 'winning', 'won', 'lost', 'retracted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent duplicate identical bids from same user on same artwork
  UNIQUE (artwork_id, bidder_id, amount)
);

-- Index for fast lookup of highest bid per artwork
CREATE INDEX idx_bids_artwork_amount ON bids (artwork_id, amount DESC);

-- ─────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE RESTRICT,
  winner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending', 'processing', 'paid', 'failed', 'refunded', 'abandoned'
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- FINANCIAL ALLOCATIONS
-- ─────────────────────────────────────────────
CREATE TABLE financial_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL UNIQUE REFERENCES artworks(id) ON DELETE RESTRICT,
  winning_amount NUMERIC(10,2) NOT NULL,
  artist_percentage NUMERIC(5,2) NOT NULL,     -- e.g. 20.00 = 20%
  artist_amount NUMERIC(10,2) NOT NULL,
  organization_percentage NUMERIC(5,2) NOT NULL,
  organization_amount NUMERIC(10,2) NOT NULL,
  processing_fees NUMERIC(10,2) DEFAULT 0,
  final_amount NUMERIC(10,2) NOT NULL,          -- final amount received by org after fees
  payout_status TEXT NOT NULL DEFAULT 'pending',-- 'pending', 'paid_artist', 'paid_org', 'complete'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- FULFILLMENT
-- ─────────────────────────────────────────────
CREATE TABLE fulfillment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL UNIQUE REFERENCES artworks(id) ON DELETE RESTRICT,
  winner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  method TEXT,                                  -- 'pickup', 'shipping'
  status TEXT NOT NULL DEFAULT 'pending',       -- 'payment_pending', 'paid', 'pickup_scheduled', 'shipped', 'delivered', 'complete'
  tracking_number TEXT,
  scheduled_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- EMAIL VERIFICATION TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- PASSWORD RESET TOKENS
-- ─────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                         -- e.g. 'bid_placed', 'artwork_updated', 'payment_received'
  entity_type TEXT NOT NULL,                    -- e.g. 'bid', 'artwork', 'payment'
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_artworks_status ON artworks (status);
CREATE INDEX idx_artworks_auction_end ON artworks (auction_end);
CREATE INDEX idx_bids_bidder_id ON bids (bidder_id);
CREATE INDEX idx_payments_status ON payments (status);
