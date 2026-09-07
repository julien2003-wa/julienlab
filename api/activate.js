import { getSession, db, normalizeCode, sha256, readJson, json, method } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const session = await getSession(req, 'user');
    if (!session) return json(res, 401, { ok: false, error: 'Connecte-toi avant d’activer une clé.' });
    const body = await readJson(req);
    const code = normalizeCode(body.code);
    if (!/^JL-[MA]-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) return json(res, 400, { ok: false, error: 'Format de clé invalide.' });
    const sql = db();
    const rows = await sql`
      WITH consumed AS (
        UPDATE jl_activation_keys
           SET redeemed_at = NOW(), redeemed_by = ${session.user_id}
         WHERE code_hash = ${sha256(code)} AND redeemed_at IS NULL
         RETURNING plan, duration_days
      )
      UPDATE jl_users u
         SET premium_until = GREATEST(COALESCE(u.premium_until, NOW()), NOW()) + c.duration_days * INTERVAL '1 day',
             last_plan = c.plan
        FROM consumed c
       WHERE u.id = ${session.user_id}
       RETURNING u.email, u.premium_until, u.last_plan`;
    if (!rows.length) {
      const keyRows = await sql`SELECT redeemed_at, redeemed_by FROM jl_activation_keys WHERE code_hash = ${sha256(code)} LIMIT 1`;
      if (!keyRows.length) return json(res, 404, { ok: false, error: 'Cette clé JulienLab n’existe pas.' });
      return json(res, 409, { ok: false, error: keyRows[0].redeemed_by === session.user_id ? 'Cette clé a déjà été utilisée sur ton compte.' : 'Cette clé a déjà été utilisée et est liée à un autre compte.' });
    }
    json(res, 200, { ok: true, message: 'Abonnement activé.', user: { email: rows[0].email, premium: true, premiumUntil: rows[0].premium_until, plan: rows[0].last_plan } });
  } catch (err) {
    console.error(err);
    json(res, 500, { ok: false, error: 'Activation impossible.' });
  }
}
