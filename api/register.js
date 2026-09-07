import { ensureSchema, db, normalizeEmail, validEmail, hashPassword, randomId, createSession, readJson, json, method, publicUser } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    await ensureSchema();
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!validEmail(email)) return json(res, 400, { ok: false, error: 'Adresse email invalide.' });
    if (password.length < 8) return json(res, 400, { ok: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    const sql = db();
    const id = randomId();
    const passwordHash = await hashPassword(password);
    const rows = await sql`INSERT INTO jl_users (id, email, password_hash)
                           VALUES (${id}, ${email}, ${passwordHash})
                           RETURNING id, email, premium_until, last_plan`;
    await createSession(res, { role: 'user', userId: id });
    json(res, 201, { ok: true, user: publicUser(rows[0]) });
  } catch (err) {
    if (err?.code === '23505') return json(res, 409, { ok: false, error: 'Un compte existe déjà avec cette adresse email.' });
    console.error(err);
    json(res, 500, { ok: false, error: 'Impossible de créer le compte.' });
  }
}
