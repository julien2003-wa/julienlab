import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';

const scryptAsync = promisify(crypto.scrypt);
let schemaPromise;

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  return neon(process.env.DATABASE_URL);
}

export function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

export function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scryptAsync(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(key).toString('hex')}`;
}

export async function verifyPassword(password, stored = '') {
  const [kind, salt, hex] = String(stored).split('$');
  if (kind !== 'scrypt' || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = Buffer.from(await scryptAsync(String(password), salt, expected.length));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function safeEqual(a = '', b = '') {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function randomId() {
  return crypto.randomUUID();
}

export function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomChars(n) {
  let out = '';
  const bytes = crypto.randomBytes(n * 2);
  for (let i = 0; out.length < n; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function generateActivationCode(plan) {
  const mark = plan === 'annual' ? 'A' : 'M';
  return `JL-${mark}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`;
}

export function normalizeCode(value = '') {
  return String(value).toUpperCase().replace(/\s+/g, '').trim();
}

export async function ensureSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const sql = db();
    await sql`CREATE TABLE IF NOT EXISTS jl_users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      premium_until TIMESTAMPTZ,
      last_plan TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS jl_sessions (
      id UUID PRIMARY KEY,
      token_hash TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user','admin')),
      user_id UUID REFERENCES jl_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS jl_sessions_token_idx ON jl_sessions(token_hash)`;
    await sql`CREATE TABLE IF NOT EXISTS jl_activation_keys (
      id UUID PRIMARY KEY,
      code_hash TEXT UNIQUE NOT NULL,
      code_hint TEXT NOT NULL,
      plan TEXT NOT NULL CHECK (plan IN ('monthly','annual')),
      duration_days INTEGER NOT NULL CHECK (duration_days > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      redeemed_at TIMESTAMPTZ,
      redeemed_by UUID REFERENCES jl_users(id),
      created_by TEXT NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS jl_activation_keys_created_idx ON jl_activation_keys(created_at DESC)`;
  })().catch(err => { schemaPromise = null; throw err; });
  return schemaPromise;
}

export function parseCookies(req) {
  const raw = req.headers?.cookie || '';
  const out = {};
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export function setSessionCookie(res, name, token, maxAgeSeconds) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const parts = [`${name}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res, name) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const parts = [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export async function createSession(res, { role, userId = null }) {
  const sql = db();
  const token = randomToken();
  const tokenHash = sha256(token);
  const seconds = role === 'admin' ? 8 * 3600 : 30 * 24 * 3600;
  const id = randomId();
  await sql`INSERT INTO jl_sessions (id, token_hash, role, user_id, expires_at)
            VALUES (${id}, ${tokenHash}, ${role}, ${userId}, NOW() + ${seconds} * INTERVAL '1 second')`;
  setSessionCookie(res, role === 'admin' ? 'jl_admin_session' : 'jl_session', token, seconds);
  return token;
}

export async function getSession(req, role = 'user') {
  await ensureSchema();
  const cookies = parseCookies(req);
  const token = cookies[role === 'admin' ? 'jl_admin_session' : 'jl_session'];
  if (!token) return null;
  const sql = db();
  const rows = await sql`SELECT s.id AS session_id, s.role, s.user_id, s.expires_at,
                                u.email, u.premium_until, u.last_plan
                         FROM jl_sessions s
                         LEFT JOIN jl_users u ON u.id = s.user_id
                         WHERE s.token_hash = ${sha256(token)}
                           AND s.role = ${role}
                           AND s.expires_at > NOW()
                         LIMIT 1`;
  return rows[0] || null;
}

export async function destroySession(req, role = 'user') {
  await ensureSchema();
  const cookies = parseCookies(req);
  const name = role === 'admin' ? 'jl_admin_session' : 'jl_session';
  const token = cookies[name];
  if (token) {
    const sql = db();
    await sql`DELETE FROM jl_sessions WHERE token_hash = ${sha256(token)} AND role = ${role}`;
  }
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function method(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { ok: false, error: 'Méthode non autorisée.' });
  return false;
}

export function publicUser(row) {
  const premiumUntil = row?.premium_until || null;
  const premium = premiumUntil ? new Date(premiumUntil).getTime() > Date.now() : false;
  return {
    id: row?.user_id || row?.id,
    email: row?.email,
    premium,
    premiumUntil,
    plan: row?.last_plan || null
  };
    }
