import { getSession, db, generateActivationCode, sha256, randomId, readJson, json, method } from '../lib/server.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const admin = await getSession(req, 'admin');
    if (!admin) return json(res, 401, { ok: false, error: 'Accès administrateur requis.' });
    const body = await readJson(req);
    const plan = body.plan === 'annual' ? 'annual' : body.plan === 'monthly' ? 'monthly' : null;
    const count = Math.max(1, Math.min(50, Number(body.count || 1)));
    if (!plan) return json(res, 400, { ok: false, error: 'Formule invalide.' });
    const days = plan === 'annual' ? 365 : 30;
    const sql = db();
    const codes = [];
    for (let i = 0; i < count; i++) {
      let inserted = false;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        const code = generateActivationCode(plan);
        const hint = `${code.slice(0, 7)}••••-••••-${code.slice(-4)}`;
        try {
          await sql`INSERT INTO jl_activation_keys (id, code_hash, code_hint, plan, duration_days, created_by)
                    VALUES (${randomId()}, ${sha256(code)}, ${hint}, ${plan}, ${days}, ${process.env.ADMIN_EMAIL || 'admin'})`;
          codes.push(code); inserted = true;
        } catch (err) {
          if (err?.code !== '23505') throw err;
        }
      }
      if (!inserted) throw new Error('Impossible de générer une clé unique.');
    }
    json(res, 201, { ok: true, plan, durationDays: days, codes, note: 'Les codes complets ne sont affichés qu’au moment de leur génération.' });
  } catch (err) {
    console.error(err);
    json(res, 500, { ok: false, error: 'Génération de clé impossible.' });
  }
}
