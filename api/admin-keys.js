import { getSession, db, json, method } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const admin = await getSession(req, 'admin');
    if (!admin) return json(res, 401, { ok: false, error: 'Accès administrateur requis.' });

    const sql = db();

    const keys = await sql`
      SELECT k.id, k.code_hint, k.assigned_email, k.plan, k.duration_days,
             k.created_at, k.redeemed_at, u.email AS redeemed_email
        FROM jl_activation_keys k
        LEFT JOIN jl_users u ON u.id = k.redeemed_by
       ORDER BY k.created_at DESC
       LIMIT 100`;

    const statsRows = await sql`
      SELECT COUNT(*)::int AS total_keys,
             COUNT(*) FILTER (WHERE redeemed_at IS NULL)::int AS available_keys,
             COUNT(*) FILTER (WHERE redeemed_at IS NOT NULL)::int AS used_keys
        FROM jl_activation_keys`;

    const userStats = await sql`
      SELECT COUNT(*)::int AS users,
             COUNT(*) FILTER (WHERE premium_until > NOW())::int AS active_subscribers
        FROM jl_users`;

    json(res, 200, { ok: true, keys, stats: { ...statsRows[0], ...userStats[0] } });
  } catch (err) {
    console.error(err);
    json(res, 500, { ok: false, error: 'Historique indisponible.' });
  }
}
