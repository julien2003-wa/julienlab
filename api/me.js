import { getSession, json, method, publicUser } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const session = await getSession(req, 'user');
    if (!session) return json(res, 200, { ok: true, authenticated: false, premium: false });
    const user = publicUser(session);
    json(res, 200, { ok: true, authenticated: true, premium: user.premium, user });
  } catch (err) {
    console.error(err);
    json(res, 500, { ok: false, authenticated: false, premium: false, error: 'État du compte indisponible.' });
  }
}
