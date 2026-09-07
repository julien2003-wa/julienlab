import { destroySession, clearSessionCookie, json, method } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try { await destroySession(req, 'admin'); } catch (err) { console.error(err); }
  clearSessionCookie(res, 'jl_admin_session');
  json(res, 200, { ok: true });
}
