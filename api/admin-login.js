import { ensureSchema, normalizeEmail, safeEqual, createSession, readJson, json, method } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    await ensureSchema();
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const expectedEmail = normalizeEmail(process.env.ADMIN_EMAIL || '');
    const expectedPassword = String(process.env.ADMIN_PASSWORD || '');
    if (!expectedEmail || !expectedPassword) return json(res, 503, { ok: false, error: 'Compte administrateur non configuré sur Vercel.' });
    if (!safeEqual(email, expectedEmail) || !safeEqual(String(body.password || ''), expectedPassword)) return json(res, 401, { ok: false, error: 'Identifiants administrateur incorrects.' });
    await createSession(res, { role: 'admin' });
    json(res, 200, { ok: true, email });
  } catch (err) {
    console.error(err);
    json(res, 500, { ok: false, error: 'Connexion administrateur impossible.' });
  }
}
