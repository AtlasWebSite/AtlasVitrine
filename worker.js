/**
 * worker.js — AtlasWeb
 * Variáveis no Cloudflare → Settings → Variables:
 *   JSONBIN_MASTER_KEY  → sua master key
 *   JSONBIN_BIN_ID      → 69b45779aa77b81da9e129e2
 *   ADM_TOKEN           → AtlasADMart
 */

const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-ADM-Token',
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // ── Rotas públicas ──
    if (method === 'GET'  && pathname === '/api/state') return handleGet(env);
    if (method === 'POST' && pathname === '/api/visit') return handleVisit(request, env);

    // ── Rotas protegidas (requer ADM_TOKEN) ──
    if (method === 'PUT'  && pathname === '/api/state') return handlePut(request, env);
    if (method === 'GET'  && pathname === '/api/stats') return handleStats(request, env);

    return json({ error: 'Not found' }, 404);
  },
};

/* ── GET /api/state ── */
async function handleGet(env) {
  try {
    const res = await fetch(`${JSONBIN_BASE}/${env.JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': env.JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' },
    });
    if (!res.ok) throw new Error(`JSONBin ${res.status}`);
    const data = await res.json();
    return json(data.record ?? data);
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}

/* ── PUT /api/state ── */
async function handlePut(request, env) {
  const token = request.headers.get('X-ADM-Token');
  if (!token || token !== env.ADM_TOKEN) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await request.json();
    const res = await fetch(`${JSONBIN_BASE}/${env.JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': env.JSONBIN_MASTER_KEY },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`JSONBin ${res.status}`);
    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}

/* ── POST /api/visit — registra uma visita no KV ── */
async function handleVisit(request, env) {
  try {
    if (!env.VISITS_KV) return json({ ok: false, error: 'KV não configurado' });

    const body     = await request.json().catch(() => ({}));
    const ip       = request.headers.get('CF-Connecting-IP') || '??';
    const country  = request.headers.get('CF-IPCountry')     || '??';
    const now      = new Date();
    const dateStr  = now.toISOString().slice(0, 10);           // YYYY-MM-DD
    const timeStr  = now.toISOString().slice(11, 16);          // HH:MM

    // Lê visitas do dia atual
    const key      = `visits:${dateStr}`;
    const existing = await env.VISITS_KV.get(key, 'json') || [];

    existing.push({
      time:    timeStr,
      country,
      ref:     body.ref || '',
    });

    // Guarda por 90 dias
    await env.VISITS_KV.put(key, JSON.stringify(existing), { expirationTtl: 90 * 24 * 3600 });

    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/* ── GET /api/stats — retorna estatísticas (protegido) ── */
async function handleStats(request, env) {
  const token = request.headers.get('X-ADM-Token');
  if (!token || token !== env.ADM_TOKEN) return json({ error: 'Unauthorized' }, 401);

  try {
    if (!env.VISITS_KV) return json({ total: 0, today: 0, visits: [], error: 'KV não configurado' });

    // Lista todas as chaves de visitas
    const list = await env.VISITS_KV.list({ prefix: 'visits:' });

    const today     = new Date().toISOString().slice(0, 10);
    let   total     = 0;
    let   todayCount = 0;
    const allVisits = [];

    // Lê os últimos 30 dias em paralelo
    const keys = list.keys.slice(-30);
    const entries = await Promise.all(
      keys.map(k => env.VISITS_KV.get(k.name, 'json').then(v => ({ date: k.name.replace('visits:', ''), visits: v || [] })))
    );

    entries.forEach(({ date, visits }) => {
      total += visits.length;
      if (date === today) todayCount = visits.length;
      visits.forEach(v => allVisits.push({ ...v, date }));
    });

    // Mais recentes primeiro
    allVisits.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    return json({ total, today: todayCount, visits: allVisits.slice(0, 100) });

  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/* ── Helper ── */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
