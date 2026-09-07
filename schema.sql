-- JulienLab V4 - Schéma PostgreSQL / Neon
-- 1 compte = 1 adresse email unique
-- Chaque nouvelle clé est liée à une adresse email précise
-- 1 clé = 1 activation unique

CREATE TABLE IF NOT EXISTS jl_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  premium_until TIMESTAMPTZ,
  last_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jl_sessions (
  id UUID PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','admin')),
  user_id UUID REFERENCES jl_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS jl_sessions_token_idx
  ON jl_sessions(token_hash);

CREATE TABLE IF NOT EXISTS jl_activation_keys (
  id UUID PRIMARY KEY,
  code_hash TEXT UNIQUE NOT NULL,
  code_hint TEXT NOT NULL,
  assigned_email TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('monthly','annual')),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES jl_users(id),
  created_by TEXT NOT NULL
);

ALTER TABLE jl_activation_keys
  ADD COLUMN IF NOT EXISTS assigned_email TEXT;

CREATE INDEX IF NOT EXISTS jl_activation_keys_created_idx
  ON jl_activation_keys(created_at DESC);

CREATE INDEX IF NOT EXISTS jl_activation_keys_assigned_email_idx
  ON jl_activation_keys(assigned_email);
