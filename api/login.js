import { ensureSchema, db, normalizeEmail, verifyPassword, createSession, readJson, json, method, publicUser } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    await ensureSchema();
    const { email: rawEmail, password } = await readJson(req);
    const email = normalizeEmail(rawEmail);
    const sql = db();
    const rows = await sql`SELECT id, email, password_hash, premium_until, last_plan FROM jl_users WHERE email = ${email} LIMIT 1`;
    const user = rows[0];
    if (!user || !(await verifyPassword(String(password || ''), user.password_hash))) return json(res, 401, { ok: false, error: 'Email ou mot de passe incorrect.' });
    await createSession(res, { role: 'user', userId: user.id });
    json(res, 200, { ok: true, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    json(res, 500, { ok: false, error: 'Connexion impossible.' });
  }
}
