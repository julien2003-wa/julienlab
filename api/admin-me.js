import { getSession, json, method } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const session = await getSession(req, 'admin');
    json(res, 200, { ok: true, authenticated: !!session, email: session ? process.env.ADMIN_EMAIL : null });
  } catch (err) {
    console.error(err);
    json(res, 500, { ok: false, authenticated: false });
  }
}
