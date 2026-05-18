/**
 * script.js — WebCraft Studio
 * ════════════════════════════════════════════════════════════
 * Sistema Handler central:
 *   - Roteamento SPA (troca de páginas sem reload)
 *   - Renderização de templates
 *   - Sistema ADM (login, edição, upload, backup)
 *   - Persistência via Cloudflare Worker (backend seguro)
 *     → Master Key do JSONBin NUNCA fica exposta no frontend
 *
 * Convenções:
 *   - Early Return: sem else aninhado
 *   - Funções pequenas e focadas
 *   - Comentários descritivos por seção
 * ════════════════════════════════════════════════════════════
 */

/* ──────────────────────────────────────────
   CONFIGURAÇÃO DO WORKER (backend seguro)
   ────────────────────────────────────────── */
const _w=['aHR0cHM6Ly93aXNweS1sYWItNjY4ZC5hdGxhc3dlYnNpdGVzMjYud29ya2Vycy5kZXY=','QXRsYXNBRE1hcnQ='];
const WORKER_CONFIG={get URL(){return atob(_w[0])},get ADM_TOKEN(){return atob(_w[1])}};

/** Verifica se o Worker está configurado */
function isWorkerConfigured() {
  return WORKER_CONFIG.URL !== 'COLE_A_URL_DO_SEU_WORKER_AQUI';
}

/* ──────────────────────────────────────────
   ESTADO GLOBAL — dados editáveis do site
   ────────────────────────────────────────── */
const DEFAULT_STATE = {
  'hero-title':    'Sites que geram <em>resultados reais</em>',
  'hero-subtitle': 'Desenvolvemos presença digital estratégica para empresas que levam o crescimento a sério. Do design à publicação, cuidamos de tudo.',
  'cta-btn':       'Solicitar orçamento',
  'cta-link':      'https://wa.me/5500000000000',
  'logo-text':     'AtlasWeb',
  'footer-text':   '© 2025 AtlasWeb. Todos os direitos reservados.',
  'whatsapp-link': 'https://wa.me/5500000000000',
  'whatsapp-label':'Falar com especialista',
  'hero-image':    '',
  'portfolio': [
  {
    'title': 'BarberKing',
    'desc': 'Site profissional para barbearia',
    'url': 'https://atlaswebsite.github.io/BARBERKING/',
    'image': ''
  },
  {
    'title': 'TechCore',
    'desc': 'Landing page para empresa de tecnologia',
    'url': 'https://atlaswebsite.github.io/TechCore/',
    'image': ''
  },
  {
    'title': 'Mordida',
    'desc': 'Site para restaurante / lanchonete',
    'url': 'https://atlaswebsite.github.io/Mordida/',
    'image': ''
  },
  {
    'title': 'TechCell',
    'desc': 'Loja de celulares e acessórios',
    'url': 'https://atlaswebsite.github.io/TechCell/',
    'image': ''
  },
  {
    'title': 'Maison Noir',
    'desc': 'Boutique de moda exclusiva',
    'url': 'https://atlaswebsite.github.io/Maison-Noir/',
    'image': ''
  },
  {
    'title': 'BurgerDrop',
    'desc': 'Site para hamburgueria',
    'url': 'https://atlaswebsite.github.io/BURGERDROP/',
    'image': ''
  },
  {
    'title': 'Vitrine',
    'desc': 'Vitrine digital para negócios locais',
    'url': 'https://atlaswebsite.github.io/Vitrine/',
    'image': ''
  },
  {
    'title': 'Pão Dourado',
    'desc': 'Padaria artesanal',
    'url': 'https://atlaswebsite.github.io/-P-o-Dourado/',
    'image': ''
  },
  {
    'title': 'Gelato Dolce',
    'desc': 'Gelateria italiana',
    'url': 'https://atlaswebsite.github.io/Gelato-Dolce/',
    'image': ''
  },
  {
    'title': 'EliteFit',
    'desc': 'Academia e personal trainer',
    'url': 'https://atlaswebsite.github.io/EliteFit/',
    'image': ''
  },
  {
    'title': 'Conduzir',
    'desc': 'Auto escola profissional',
    'url': 'https://atlaswebsite.github.io/Conduzir/',
    'image': ''
  },
  {
    'title': 'Lumina',
    'desc': 'Decoração e design de interiores',
    'url': 'https://atlaswebsite.github.io/Lumina/',
    'image': ''
  },
  {
    'title': 'SorrisoVivo',
    'desc': 'Clínica odontológica',
    'url': 'https://atlaswebsite.github.io/SorrisoVivo/',
    'image': ''
  },
  {
    'title': 'Magnólia',
    'desc': 'Floricultura e presentes',
    'url': 'https://atlaswebsite.github.io/Magn-lia/',
    'image': ''
  },
  {
    'title': 'PataFeliz',
    'desc': 'Pet shop e clínica veterinária',
    'url': 'https://atlaswebsite.github.io/PataFeliz/',
    'image': ''
  }
],
};

// Estado ativo (mutável durante a sessão)
let STATE = { ...DEFAULT_STATE };

/* ──────────────────────────────────────────
   CLOUD SYNC — via Cloudflare Worker (seguro)
   A Master Key do JSONBin fica NO WORKER,
   nunca exposta no navegador do visitante.
   ────────────────────────────────────────── */

/**
 * Busca o STATE via Worker (leitura pública, sem token)
 * Fallback: localStorage se Worker não estiver configurado
 */
async function loadStateFromCloud() {
  if (!isWorkerConfigured()) return loadStateLocal();

  try {
    const res = await fetch(`${WORKER_CONFIG.URL}/api/state`);
    if (!res.ok) throw new Error(`Worker GET: ${res.status}`);
    const data = await res.json();
    const merged = { ...DEFAULT_STATE, ...data };
    merged['portfolio'] = (data['portfolio'] && data['portfolio'].length > 0)
      ? data['portfolio']
      : DEFAULT_STATE['portfolio'];
    return merged;
  } catch (err) {
    console.warn('Worker: falha ao carregar, usando local.', err.message);
    return loadStateLocal();
  }
}

/**
 * Salva o STATE via Worker (requer ADM_TOKEN)
 * Salva também localmente como cache offline
 */
async function saveStateToCloud(state) {
  saveStateLocal(state);

  if (!isWorkerConfigured()) {
    console.warn('Worker não configurado.');
    return false;
  }



  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${WORKER_CONFIG.URL}/api/state`, {
      method:  'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-ADM-Token':  WORKER_CONFIG.ADM_TOKEN,
      },
      body: JSON.stringify(state),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Worker PUT: ${res.status}`);
    return true;

  } catch (err) {
    clearTimeout(timeout);
    const msg = err.name === 'AbortError' ? 'timeout' : err.message;
    console.warn('Worker: falha ao salvar.', msg);
    return false;
  }
}

/* ── Cache local (fallback offline) ── */
function loadStateLocal() {
  try {
    const saved = localStorage.getItem('webcraft_state');
    if (!saved) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(saved);
    const merged = { ...DEFAULT_STATE, ...parsed };
    merged['portfolio'] = (parsed['portfolio'] && parsed['portfolio'].length > 0)
      ? parsed['portfolio']
      : DEFAULT_STATE['portfolio'];
    return merged;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveStateLocal(state) {
  try {
    localStorage.setItem('webcraft_state', JSON.stringify(state));
  } catch { /* silencia erro de quota */ }
}


/* ──────────────────────────────────────────
   HANDLER SVG — Ilustração animada do sistema
   Engrenagens concêntricas + nós satélites
   ────────────────────────────────────────── */
const HANDLER_SVG = `
<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:transparent;">
  <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"
       style="width:100%;height:100%;max-width:400px;max-height:400px;">
    <defs>
      <radialGradient id="hBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#e8ff47" stop-opacity="0.07"/>
        <stop offset="100%" stop-color="#0a0a0a" stop-opacity="0"/>
      </radialGradient>
      <filter id="hGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="hGlowStrong" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="12" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#e8ff47" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#e8ff47" stop-opacity="0.15"/>
      </linearGradient>
    </defs>

    <!-- Fundo -->
    <rect width="400" height="400" fill="url(#hBg)" rx="20"/>

    <!-- Anéis guia -->
    <circle cx="200" cy="200" r="178" fill="none" stroke="#1e1e1e" stroke-width="1" stroke-dasharray="6 9"/>
    <circle cx="200" cy="200" r="138" fill="none" stroke="#1a1a1a" stroke-width="1" stroke-dasharray="4 7"/>
    <circle cx="200" cy="200" r="95"  fill="none" stroke="#222"    stroke-width="1" stroke-dasharray="3 6"/>

    <!-- ── Engrenagem EXTERNA grande ── -->
    <g class="hs-gear-a" style="transform-origin:200px 200px">
      <circle cx="200" cy="200" r="128" fill="#0d0d0d" stroke="#272727" stroke-width="1.5"/>
      <!-- 20 dentes -->
      <g fill="#181818" stroke="#323232" stroke-width="1">
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(0   200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(18  200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(36  200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(54  200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(72  200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(90  200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(108 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(126 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(144 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(162 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(180 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(198 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(216 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(234 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(252 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(270 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(288 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(306 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(324 200 200)"/>
        <rect x="196" y="66" width="8" height="22" rx="3" transform="rotate(342 200 200)"/>
      </g>
      <!-- Furos decorativos -->
      <circle cx="200" cy="112" r="9" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(0   200 200)"/>
      <circle cx="200" cy="112" r="9" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(45  200 200)"/>
      <circle cx="200" cy="112" r="9" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(90  200 200)"/>
      <circle cx="200" cy="112" r="9" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(135 200 200)"/>
      <circle cx="200" cy="112" r="9" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(180 200 200)"/>
      <circle cx="200" cy="112" r="9" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(225 200 200)"/>
      <circle cx="200" cy="112" r="9" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(270 200 200)"/>
      <circle cx="200" cy="112" r="9" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(315 200 200)"/>
    </g>

    <!-- ── Engrenagem MÉDIA (contra-rotação) ── -->
    <g class="hs-gear-b" style="transform-origin:200px 200px">
      <circle cx="200" cy="200" r="78" fill="#0b0b0b" stroke="#242424" stroke-width="1.5"/>
      <!-- 14 dentes -->
      <g fill="#141414" stroke="#2d2d2d" stroke-width="1">
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(0    200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(25.7 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(51.4 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(77.1 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(102.8 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(128.5 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(154.2 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(180  200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(205.7 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(231.4 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(257.1 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(282.8 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(308.5 200 200)"/>
        <rect x="197" y="118" width="6" height="16" rx="2" transform="rotate(334.2 200 200)"/>
      </g>
      <!-- Furos médios -->
      <circle cx="200" cy="148" r="6" fill="#0a0a0a" stroke="#252525" stroke-width="1" transform="rotate(0   200 200)"/>
      <circle cx="200" cy="148" r="6" fill="#0a0a0a" stroke="#252525" stroke-width="1" transform="rotate(60  200 200)"/>
      <circle cx="200" cy="148" r="6" fill="#0a0a0a" stroke="#252525" stroke-width="1" transform="rotate(120 200 200)"/>
      <circle cx="200" cy="148" r="6" fill="#0a0a0a" stroke="#252525" stroke-width="1" transform="rotate(180 200 200)"/>
      <circle cx="200" cy="148" r="6" fill="#0a0a0a" stroke="#252525" stroke-width="1" transform="rotate(240 200 200)"/>
      <circle cx="200" cy="148" r="6" fill="#0a0a0a" stroke="#252525" stroke-width="1" transform="rotate(300 200 200)"/>
    </g>

    <!-- ── Anel luminoso central ── -->
    <circle cx="200" cy="200" r="42" fill="none" stroke="url(#ringGrad)" stroke-width="1.5" filter="url(#hGlow)"/>

    <!-- ── Núcleo ── -->
    <circle cx="200" cy="200" r="34" fill="#0d0d0d" stroke="#2a2a2a" stroke-width="1"/>
    <circle cx="200" cy="200" r="18" fill="#e8ff47" opacity="0.93" filter="url(#hGlowStrong)"/>
    <circle cx="200" cy="200" r="10" fill="#0a0a0a"/>
    <circle cx="200" cy="200" r="4"  fill="#e8ff47" opacity="0.75"/>

    <!-- ── Nós satélites com retângulos ── -->

    <!-- ESQUERDA -->
    <line x1="158" y1="200" x2="100" y2="200" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
    <rect x="28" y="187" width="72" height="26" rx="7" fill="#111" stroke="#e8ff47" stroke-width="1.2" opacity="0.85"/>
    <circle cx="44" cy="200" r="4.5" fill="#e8ff47" filter="url(#hGlow)" opacity="0.9"/>

    <!-- DIREITA -->
    <line x1="242" y1="200" x2="300" y2="200" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
    <rect x="300" y="187" width="72" height="26" rx="7" fill="#111" stroke="#e8ff47" stroke-width="1.2" opacity="0.85"/>
    <circle cx="316" cy="200" r="4.5" fill="#e8ff47" filter="url(#hGlow)" opacity="0.9"/>

    <!-- SUPERIOR ESQUERDO -->
    <line x1="170" y1="170" x2="126" y2="126" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
    <rect x="62" y="90" width="68" height="26" rx="7" fill="#111" stroke="#e8ff47" stroke-width="1.2" opacity="0.85"/>
    <circle cx="78" cy="103" r="4.5" fill="#e8ff47" filter="url(#hGlow)" opacity="0.9"/>

    <!-- SUPERIOR DIREITO -->
    <line x1="230" y1="170" x2="274" y2="126" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
    <rect x="270" y="90" width="68" height="26" rx="7" fill="#111" stroke="#e8ff47" stroke-width="1.2" opacity="0.85"/>
    <circle cx="286" cy="103" r="4.5" fill="#e8ff47" filter="url(#hGlow)" opacity="0.9"/>

    <!-- INFERIOR ESQUERDO -->
    <line x1="170" y1="230" x2="126" y2="274" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
    <rect x="62" y="284" width="68" height="26" rx="7" fill="#111" stroke="#e8ff47" stroke-width="1.2" opacity="0.85"/>
    <circle cx="78" cy="297" r="4.5" fill="#e8ff47" filter="url(#hGlow)" opacity="0.9"/>

    <!-- INFERIOR DIREITO -->
    <line x1="230" y1="230" x2="274" y2="274" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
    <rect x="270" y="284" width="68" height="26" rx="7" fill="#111" stroke="#e8ff47" stroke-width="1.2" opacity="0.85"/>
    <circle cx="286" cy="297" r="4.5" fill="#e8ff47" filter="url(#hGlow)" opacity="0.9"/>

    <!-- ── Label inferior ── -->
    <text x="200" y="390"
          text-anchor="middle"
          font-family="'Syne',sans-serif"
          font-size="9"
          font-weight="700"
          letter-spacing="5"
          fill="#333">HANDLER SYSTEM</text>

    <!-- ── Animações ── -->
    <style>
      .hs-gear-a { animation: hsRotA 22s linear infinite;         transform-origin: 200px 200px; }
      .hs-gear-b { animation: hsRotB 14s linear infinite reverse; transform-origin: 200px 200px; }
      @keyframes hsRotA { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes hsRotB { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
  </svg>
</div>
`;

/* ──────────────────────────────────────────
   TEMPLATES DAS PÁGINAS
   Cada página é uma função que recebe STATE
   e retorna HTML string.
   ────────────────────────────────────────── */
const pages = {

  /** ── Página: Início ─────────────────── */
  inicio: (s) => `
    <section class="hero container">
      <div class="hero__inner">

        <!-- Coluna texto -->
        <div class="hero__text">
          <div class="hero__eyebrow">Agência Digital</div>
          <h1 class="hero__title" data-editable="hero-title">${s['hero-title']}</h1>
          <div class="hero__divider"></div>
          <p class="hero__subtitle" data-editable="hero-subtitle">${s['hero-subtitle']}</p>
          <div class="hero__actions">
            <a href="${s['cta-link']}" class="btn btn--primary" data-link="cta-link" target="_blank" rel="noopener">
              <span data-editable="cta-btn">${s['cta-btn']}</span>
              <svg width="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="#" class="btn btn--outline" data-page="funciona">Como trabalhamos</a>
          </div>
          <div class="hero__trust">
            <div class="hero__trust-item">
              <span class="hero__trust-num">100%</span>
              <span class="hero__trust-label">Sites Responsivos</span>
            </div>
            <div class="hero__trust-sep"></div>
            <div class="hero__trust-item">
              <span class="hero__trust-num">Suporte Direto</span>
              <span class="hero__trust-label">Com o desenvolvedor</span>
            </div>
            <div class="hero__trust-sep"></div>
            <div class="hero__trust-item">
              <span class="hero__trust-num">7 dias</span>
              <span class="hero__trust-label">Prazo médio</span>
            </div>
          </div>
        </div>

        <!-- Coluna visual -->
        <div class="hero__visual">
          ${s['hero-image']
            ? `<img src="${s['hero-image']}" alt="AtlasWeb" class="hero__img" />`
            : HANDLER_SVG
          }
        </div>

      </div>
    </section>
  `,

  /** ── Página: Como Funciona ──────────── */
  funciona: () => `
    <section class="funciona container">
      <div class="section__header">
        <p class="section__tag">
          <svg width="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
          Processo simples
        </p>
        <h2 class="section__title">Como Funciona</h2>
        <p class="section__subtitle">Em apenas 3 etapas simples, seu negócio ganha presença digital profissional.</p>
      </div>

      <div class="steps">
        <div class="step-card">
          <div class="step-card__num">01</div>
          <div class="step-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.9 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.81 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <h3 class="step-card__title">Você entra em contato</h3>
          <p class="step-card__desc">Fale conosco pelo WhatsApp ou formulário. Entendemos suas necessidades, objetivos e o perfil do seu negócio.</p>
        </div>

        <div class="step-card">
          <div class="step-card__num">02</div>
          <div class="step-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
          </div>
          <h3 class="step-card__title">Criamos o design do seu site</h3>
          <p class="step-card__desc">Nossa equipe desenvolve um layout moderno e personalizado, seguindo a identidade visual e os valores da sua marca.</p>
        </div>

        <div class="step-card">
          <div class="step-card__num">03</div>
          <div class="step-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <h3 class="step-card__title">Publicamos seu site online</h3>
          <p class="step-card__desc">Após aprovação, colocamos seu site no ar com domínio, hospedagem e tudo configurado. Pronto para receber clientes!</p>
        </div>
      </div>
    </section>
  `,

  /** ── Página: Por Que Investir ───────── */
  investir: (s) => `
    <section class="investir container">
      <div class="section__header">
        <p class="section__tag">
          <svg width="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
          Seus resultados
        </p>
        <h2 class="section__title">Por Que Investir em um Site?</h2>
        <p class="section__subtitle">Um site profissional é o melhor investimento para o crescimento sustentável do seu negócio.</p>
      </div>

      <div class="benefits">
        <div class="benefit-card">
          <div class="benefit-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <h4 class="benefit-card__title">Mais clientes</h4>
            <p class="benefit-card__desc">Alcance pessoas que pesquisam seus produtos ou serviços no Google, ampliando significativamente seu público.</p>
          </div>
        </div>

        <div class="benefit-card">
          <div class="benefit-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <h4 class="benefit-card__title">Mais credibilidade</h4>
            <p class="benefit-card__desc">Transmita profissionalismo e confiança. Clientes confiam mais em empresas que possuem um site bem estruturado.</p>
          </div>
        </div>

        <div class="benefit-card">
          <div class="benefit-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <h4 class="benefit-card__title">Presença online 24 horas</h4>
            <p class="benefit-card__desc">Seu site trabalha por você o tempo todo, mesmo enquanto você dorme. Disponível 365 dias por ano, 24h por dia.</p>
          </div>
        </div>

        <div class="benefit-card">
          <div class="benefit-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div>
            <h4 class="benefit-card__title">Crescimento do negócio</h4>
            <p class="benefit-card__desc">Com mais visibilidade e autoridade digital, suas vendas crescem de forma orgânica e consistente ao longo do tempo.</p>
          </div>
        </div>
      </div>

      <!-- CTA final -->
      <div class="investir__cta">
        <h3 class="investir__cta-title">Pronto para <span>transformar</span> seu negócio?</h3>
        <p class="investir__cta-sub">Entre em contato agora e receba um orçamento gratuito e personalizado.</p>
        <a href="${s['cta-link']}" class="btn btn--primary" target="_blank" rel="noopener">
          ${s['cta-btn']}
          <svg width="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
    </section>
  `,

  /** ── Página: Portfólio ──────────────── */
  portfolio: (s) => {
    // Sempre usa os 15 do DEFAULT como base.
    // Se a nuvem tiver imagem salva para um item com mesmo título, aproveita.
    const cloudMap = {};
    if (Array.isArray(s['portfolio'])) {
      s['portfolio'].forEach(p => { if (p.title) cloudMap[p.title] = p; });
    }
    const items = DEFAULT_STATE['portfolio'].map(def => {
      const cloud = cloudMap[def.title];
      return cloud ? { ...def, ...cloud, title: def.title, url: def.url } : def;
    });
    const empty = `
      <div class="portfolio__empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
        <p>Nenhum projeto cadastrado ainda.</p>
        <span>Acesse o painel ADM → aba Portfólio para adicionar.</span>
      </div>`;

    const cards = items.map((p, i) => `
      <a class="pf-card" href="${p.url || '#'}" target="_blank" rel="noopener" title="${p.title || ''}">
        <div class="pf-card__img-wrap">
          ${p.image
            ? `<img src="${p.image}" alt="${p.title || 'Projeto'}" class="pf-card__img" loading="lazy" />`
            : `<div class="pf-card__placeholder" id="pf-ph-${i}" data-url="${p.url || ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="36"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 9 4-4 4 4 4-6 4 6"/><circle cx="8.5" cy="8.5" r="1.5"/></svg></div>`
          }
          <div class="pf-card__overlay">
            <span class="pf-card__visit">Visitar site ↗</span>
          </div>
        </div>
        <div class="pf-card__body">
          <h3 class="pf-card__title">${p.title || 'Sem título'}</h3>
          ${p.desc ? `<p class="pf-card__desc">${p.desc}</p>` : ''}
        </div>
      </a>`).join('');

    // Carrega miniaturas automaticamente após render
    setTimeout(() => {
      document.querySelectorAll('.pf-card__placeholder[data-url]').forEach(ph => {
        const url = ph.dataset.url;
        if (!url) return;
        fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`)
          .then(r => r.json())
          .then(data => {
            const imgUrl = data?.data?.screenshot?.url;
            if (!imgUrl) return;
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = 'Miniatura';
            img.className = 'pf-card__img';
            img.loading = 'lazy';
            ph.replaceWith(img);
            // Atualiza o item no STATE para cache futuro
            const title = ph.closest('.pf-card')?.querySelector('.pf-card__title')?.textContent;
            if (title && Array.isArray(STATE['portfolio'])) {
              const found = STATE['portfolio'].find(p => p.title === title);
              if (found) { found.image = imgUrl; saveStateLocal(STATE); }
            }
          }).catch(() => {});
      });
    }, 100);

    return `
    <section class="portfolio container">
      <div class="section__header">
        <p class="section__tag">Nosso trabalho</p>
        <h2 class="section__title">Portfólio</h2>
        <p class="section__subtitle">Alguns dos projetos que desenvolvemos para nossos clientes.</p>
      </div>
      <div class="pf-grid">
        ${items.length ? cards : empty}
      </div>
    </section>`;
  },
};


/* ──────────────────────────────────────────
   ROTEAMENTO SPA
   ────────────────────────────────────────── */

/** Página ativa atual */
let currentPage = 'inicio';

/**
 * Navega para uma página sem reload
 * @param {string} pageKey - chave da página (inicio | funciona | investir)
 */
function navigateTo(pageKey, force = false) {
  const template = pages[pageKey];
  if (!template) return;

  // Early return: já está nessa página e não é forçado (ex: sync da nuvem)
  if (pageKey === currentPage && !force) return;

  const container = document.getElementById('main-content');
  if (!container) return;

  // Atualiza conteúdo
  container.innerHTML = template(STATE);
  container.querySelector('section')?.classList.add('page-enter');

  // Atualiza estado da nav
  currentPage = pageKey;
  updateNavActive(pageKey);

  // Re-registra eventos dos links internos da página
  bindInternalLinks();

  // Fecha menu mobile se aberto
  closeMobileMenu();
}

/** Atualiza o link ativo na navbar */
function updateNavActive(pageKey) {
  document.querySelectorAll('.nav__link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageKey);
  });
}

/** Registra cliques em links que usam data-page */
function bindInternalLinks() {
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });
}


/* ──────────────────────────────────────────
   MENU HAMBÚRGUER (mobile)
   ────────────────────────────────────────── */

function initHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');

  if (!btn || !links) return;

  btn.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
  });
}

function closeMobileMenu() {
  document.getElementById('navLinks')?.classList.remove('open');
  const btn = document.getElementById('hamburger');
  btn?.classList.remove('open');
  btn?.setAttribute('aria-expanded', 'false');
}


/* ──────────────────────────────────────────
   HANDLER SYSTEM — Funções de atualização
   ────────────────────────────────────────── */

/**
 * Atualiza um texto no DOM e no STATE
 * @param {string} key   - chave no STATE
 * @param {string} value - novo valor
 */
function updateText(key, value) {
  STATE[key] = value;

  // Aplica nos elementos que têm data-editable com essa chave
  document.querySelectorAll(`[data-editable="${key}"]`).forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
      return;
    }
    el.innerHTML = value;
  });
}

/**
 * Atualiza uma imagem no DOM e no STATE
 * @param {string} key     - chave no STATE
 * @param {string} dataUrl - base64 da imagem
 */
function updateImage(key, dataUrl) {
  STATE[key] = dataUrl;

  // Substitui a imagem hero se estiver na página inicio
  if (key === 'hero-image') {
    const heroVisual = document.querySelector('.hero__visual');
    if (!heroVisual) return;

    const existing = heroVisual.querySelector('.hero__img, .hero__img-placeholder');
    if (!dataUrl) return;

    if (existing?.tagName === 'IMG') {
      existing.src = dataUrl;
      return;
    }

    // Substitui placeholder por img
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Site profissional';
    img.className = 'hero__img';
    img.id = 'heroImg';
    heroVisual.innerHTML = '';
    heroVisual.appendChild(img);
  }
}

/**
 * Atualiza um link no DOM e no STATE
 * @param {string} key  - chave no STATE
 * @param {string} href - novo href
 */
function updateLink(key, href) {
  STATE[key] = href;

  document.querySelectorAll(`[data-link="${key}"]`).forEach(el => {
    el.href = href;
  });

  // Atualiza WhatsApp float se for esse link
  if (key === 'whatsapp-link') {
    const wa = document.getElementById('whatsappBtn');
    if (wa) wa.href = href;
  }
}

/** Salva STATE na nuvem e mostra feedback */
async function saveChanges() {
  // Feedback imediato de carregamento
  showSaveFeedback('Salvando...', false);

  const ok = await saveStateToCloud(STATE);

  showSaveFeedback(
    ok
      ? '✓ Salvo na nuvem! Todos verão as alterações.'
      : isJsonBinConfigured()
        ? '⚠ Erro na nuvem. Salvo localmente.'
        : '⚠ Configure o JSONBin para sincronizar com todos.'
  );

  // Re-renderiza a página atual com o STATE atualizado
  navigateTo(currentPage, true);
}

/** Carrega as alterações do localStorage para os campos do ADM */
function loadChangesIntoPanel() {
  setValue('edit-hero-title',     STATE['hero-title']);
  setValue('edit-hero-subtitle',  STATE['hero-subtitle']);
  setValue('edit-cta-btn',        STATE['cta-btn']);
  setValue('edit-logo-text',      STATE['logo-text']);
  setValue('edit-footer-text',    STATE['footer-text']);
  setValue('edit-whatsapp-label', STATE['whatsapp-label']);
  setValue('edit-whatsapp-link',  STATE['whatsapp-link']);
  setValue('edit-cta-link',       STATE['cta-link']);

  // Preview da imagem salva
  if (STATE['hero-image']) {
    renderImagePreview(STATE['hero-image']);
  }
}

/** Helper: define value de um input/textarea por id */
function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value ?? '';
}

/** Mostra mensagem de feedback no painel ADM */
function showSaveFeedback(msg, autoHide = true) {
  const el = document.getElementById('saveFeedback');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  if (!autoHide) return;
  setTimeout(() => el.classList.remove('visible'), 4000);
}


/* ──────────────────────────────────────────
   UPLOAD DE IMAGEM
   ────────────────────────────────────────── */

function initImageUpload() {
  const input = document.getElementById('heroImageUpload');
  if (!input) return;

  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      STATE['hero-image'] = dataUrl;
      renderImagePreview(dataUrl);
      updateImage('hero-image', dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

/** Renderiza preview da imagem no painel ADM */
function renderImagePreview(src) {
  const container = document.getElementById('imagePreview');
  if (!container) return;
  container.innerHTML = `<img src="${src}" alt="Preview" />`;
}


/* ──────────────────────────────────────────
   PORTFÓLIO ADM — gerenciamento de projetos
   ────────────────────────────────────────── */

function initPortfolioAdm() {
  const saveBtn      = document.getElementById('pfSaveBtn');
  const cancelBtn    = document.getElementById('pfCancelBtn');
  const previewBtn   = document.getElementById('pfPreviewBtn');
  const urlInput     = document.getElementById('pf-url');

  if (!saveBtn) return;

  // Gera miniatura ao clicar em "Prévia" ou ao sair do campo URL
  previewBtn?.addEventListener('click', () => generateScreenshot(urlInput?.value.trim()));
  urlInput?.addEventListener('blur', () => {
    const url = urlInput.value.trim();
    if (url) generateScreenshot(url);
  });

  saveBtn.addEventListener('click', savePortfolioItem);
  cancelBtn?.addEventListener('click', resetPortfolioForm);

  renderPortfolioAdmList();
}

/**
 * Gera miniatura do site usando screenshot API gratuita
 * Salva apenas a URL da miniatura — não o base64 — ultra leve
 */
function generateScreenshot(url) {
  if (!url) return;
  try { new URL(url); } catch { return; } // URL inválida

  const previewWrap = document.getElementById('pf-screenshot-preview');
  const previewImg  = document.getElementById('pf-screenshot-img');
  if (!previewWrap || !previewImg) return;

  // minishot.io — gratuito, sem chave, retorna imagem direto
  const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;

  previewImg.src = '';
  previewWrap.style.display = 'block';
  previewImg.alt = 'Carregando miniatura...';

  // Busca a URL da imagem via API JSON
  fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`)
    .then(r => r.json())
    .then(data => {
      const imgUrl = data?.data?.screenshot?.url;
      if (imgUrl) {
        previewImg.src = imgUrl;
        previewImg.alt = 'Miniatura do site';
        // Guarda a URL da miniatura (não o base64 — muito mais leve)
        previewImg.dataset.screenshotUrl = imgUrl;
      } else {
        previewWrap.style.display = 'none';
      }
    })
    .catch(() => { previewWrap.style.display = 'none'; });
}

/** Renderiza a lista de projetos no painel ADM */
function renderPortfolioAdmList() {
  const list = document.getElementById('portfolioAdmList');
  if (!list) return;

  const items = Array.isArray(STATE['portfolio']) ? STATE['portfolio'] : [];

  if (!items.length) {
    list.innerHTML = `<p style="font-size:.82rem;color:var(--color-text-muted);margin-bottom:1rem;">Nenhum projeto ainda. Preencha o formulário abaixo para adicionar.</p>`;
    return;
  }

  list.innerHTML = items.map((p, i) => `
    <div class="pf-adm-item">
      ${p.image ? `<img src="${p.image}" alt="${p.title}" class="pf-adm-item__img" />` : `<div class="pf-adm-item__img pf-adm-item__img--empty"></div>`}
      <div class="pf-adm-item__info">
        <strong>${p.title || 'Sem título'}</strong>
        <span>${p.desc || ''}</span>
        <small>${p.url || ''}</small>
      </div>
      <div class="pf-adm-item__actions">
        <button class="btn btn--outline" onclick="editPortfolioItem(${i})" title="Editar">✏</button>
        <button class="btn btn--danger" onclick="deletePortfolioItem(${i})" title="Remover">✕</button>
      </div>
    </div>`).join('');
}

/** Salva ou atualiza um projeto */
async function savePortfolioItem() {
  const title = document.getElementById('pf-title')?.value.trim();
  const desc  = document.getElementById('pf-desc')?.value.trim();
  const url   = document.getElementById('pf-url')?.value.trim();
  const idx   = parseInt(document.getElementById('portfolio-edit-index')?.value ?? '-1');

  // Pega URL da miniatura gerada (não base64 — é só uma URL externa, levíssima)
  const screenshotImg = document.getElementById('pf-screenshot-img');
  const image = screenshotImg?.dataset.screenshotUrl || '';

  if (!title) { pfFeedback('Preencha pelo menos o título.'); return; }

  if (!Array.isArray(STATE['portfolio'])) STATE['portfolio'] = [];

  const item = { title, desc, url, image };

  if (idx >= 0) {
    STATE['portfolio'][idx] = item;   // edição
  } else {
    STATE['portfolio'].push(item);    // novo
  }

  pfFeedback('Salvando...', false);
  const ok = await saveStateToCloud(STATE);

  pfFeedback(ok ? '✓ Projeto salvo!' : '⚠ Salvo localmente.');
  resetPortfolioForm();
  renderPortfolioAdmList();
  if (currentPage === 'portfolio') navigateTo('portfolio', true);
}

/** Carrega dados de um projeto para edição */
function editPortfolioItem(i) {
  const items = STATE['portfolio'] || [];
  const p = items[i];
  if (!p) return;

  document.getElementById('pf-title').value = p.title || '';
  document.getElementById('pf-desc').value  = p.desc  || '';
  document.getElementById('pf-url').value   = p.url   || '';
  document.getElementById('portfolio-edit-index').value = i;

  // Restaura preview da miniatura
  const previewWrap = document.getElementById('pf-screenshot-preview');
  const previewImg  = document.getElementById('pf-screenshot-img');
  if (previewWrap && previewImg && p.image) {
    previewImg.src = p.image;
    previewImg.dataset.screenshotUrl = p.image;
    previewWrap.style.display = 'block';
  } else if (previewWrap) {
    previewWrap.style.display = 'none';
  }

  const cancelBtn = document.getElementById('pfCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  document.getElementById('pfSaveBtn').textContent = 'Atualizar projeto';
  document.getElementById('portfolioForm')?.scrollIntoView({ behavior: 'smooth' });
}

/** Remove um projeto */
async function deletePortfolioItem(i) {
  if (!confirm('Remover este projeto do portfólio?')) return;
  STATE['portfolio'].splice(i, 1);
  await saveStateToCloud(STATE);
  renderPortfolioAdmList();
  if (currentPage === 'portfolio') navigateTo('portfolio', true);
}

/** Limpa o formulário */
function resetPortfolioForm() {
  ['pf-title','pf-desc','pf-url'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('portfolio-edit-index').value = '-1';

  // Limpa preview de miniatura
  const previewWrap = document.getElementById('pf-screenshot-preview');
  const previewImg  = document.getElementById('pf-screenshot-img');
  if (previewWrap) previewWrap.style.display = 'none';
  if (previewImg)  { previewImg.src = ''; previewImg.dataset.screenshotUrl = ''; }

  const cancelBtn = document.getElementById('pfCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  document.getElementById('pfSaveBtn').textContent = 'Salvar projeto';
  pfFeedback('');
}

function pfFeedback(msg, autoHide = true) {
  const el = document.getElementById('pfFeedback');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('visible', !!msg);
  if (autoHide && msg) setTimeout(() => { el.classList.remove('visible'); }, 3500);
}


/* ──────────────────────────────────────────
   PAINEL ADM — Login seguro via Worker
   ────────────────────────────────────────── */

/* ──────────────────────────────────────────
   PAINEL ADM — Login via hash local
   Senha verificada no browser com SHA-256.
   Para trocar a senha: gere o hash em
   https://emn178.github.io/online-tools/sha256.html
   e substitua ADM_HASH abaixo.
   ────────────────────────────────────────── */

const ADM_HASH = 'ac1f926519da7acfc9dda72b955723b1554975fe0a8648738806716b0e7f6a2a';

async function hashPassword(pwd) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function initAdmLogin() {
  const triggerBtn = document.getElementById('admTrigger');
  const loginModal = document.getElementById('admLoginModal');
  const closeBtn   = document.getElementById('closeLoginModal');
  const loginBtn   = document.getElementById('admLoginBtn');
  const errorEl    = document.getElementById('admError');
  const passInput  = document.getElementById('admPassword');

  if (!triggerBtn || !loginModal) return;

  triggerBtn.addEventListener('click', () => { loginModal.classList.add('open'); passInput?.focus(); });
  closeBtn?.addEventListener('click', closeLoginModal);
  loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeLoginModal(); });
  loginBtn?.addEventListener('click', attemptLogin);
  passInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') attemptLogin(); });

  function closeLoginModal() {
    loginModal.classList.remove('open');
    if (passInput) passInput.value = '';
    if (errorEl) { errorEl.textContent = 'Senha incorreta.'; errorEl.classList.remove('visible'); }
  }

  async function attemptLogin() {
    if (!passInput) return;
    const pwd = passInput.value.trim();
    if (!pwd) return;

    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Verificando...'; }
    errorEl?.classList.remove('visible');

    const hash = await hashPassword(pwd);

    if (hash !== ADM_HASH) {
      if (errorEl) { errorEl.textContent = 'Senha incorreta.'; errorEl.classList.add('visible'); }
      passInput.select();
      if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Entrar'; }
      return;
    }

    // Senha correta — libera acesso ao painel
    sessionStorage.setItem('adm_active', '1'); // marca que é o ADM — não conta visita
    closeLoginModal();
    openAdmPanel();
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Entrar'; }
  }
}


/* ──────────────────────────────────────────
   PAINEL ADM — Dashboard
   ────────────────────────────────────────── */

function openAdmPanel() {
  const panel   = document.getElementById('admPanel');
  const overlay = document.getElementById('admOverlay');

  panel?.classList.add('open');
  overlay?.classList.add('open');
  document.body.style.overflow = 'hidden';

  loadChangesIntoPanel();
  initImageUpload();
  initPortfolioAdm();
  updateCloudStatusIndicator();
}

function closeAdmPanel() {
  const panel   = document.getElementById('admPanel');
  const overlay = document.getElementById('admOverlay');

  panel?.classList.remove('open');
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
}

function initAdmPanel() {
  document.getElementById('closeAdmPanel')?.addEventListener('click', closeAdmPanel);
  document.getElementById('admOverlay')?.addEventListener('click', closeAdmPanel);

  // Salvar alterações
  document.getElementById('saveChangesBtn')?.addEventListener('click', () => {
    collectPanelValues();
    saveChanges();
  });

  // Tabs
  document.querySelectorAll('.adm-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Backup
  initBackupSystem();

  // Botão atualizar visitas
  document.getElementById('statsRefreshBtn')?.addEventListener('click', loadStats);
}

/** Atualiza o indicador de status da nuvem no painel */
function updateCloudStatusIndicator() {
  const box   = document.getElementById('cloudConfigStatus');
  const label = document.getElementById('cloudStatusLabel');
  const desc  = document.getElementById('cloudStatusDesc');
  const guide = document.getElementById('jsonbinGuide');

  if (!box || !label || !desc) return;

  if (isWorkerConfigured()) {
    box.className = 'adm-cloud-status ok';
    label.textContent = '☁ Worker conectado';
    desc.textContent  = 'Alterações salvas com segurança para todos os visitantes.';
    guide?.removeAttribute('open');
  } else {
    box.className = 'adm-cloud-status warn';
    label.textContent = '⚠ Worker não configurado';
    desc.textContent  = 'Faça o deploy do worker.js no Cloudflare Workers.';
    if (guide) guide.setAttribute('open', '');
  }
}

/** Coleta valores dos campos do painel e atualiza STATE */
function collectPanelValues() {
  const fields = {
    'hero-title':      'edit-hero-title',
    'hero-subtitle':   'edit-hero-subtitle',
    'cta-btn':         'edit-cta-btn',
    'logo-text':       'edit-logo-text',
    'footer-text':     'edit-footer-text',
    'whatsapp-label':  'edit-whatsapp-label',
    'whatsapp-link':   'edit-whatsapp-link',
    'cta-link':        'edit-cta-link',
  };

  Object.entries(fields).forEach(([key, inputId]) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    STATE[key] = el.value;
  });
}

/** Troca aba ativa no painel */
function switchTab(tabKey) {
  document.querySelectorAll('.adm-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabKey);
  });
  document.querySelectorAll('.adm-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${tabKey}`);
  });
  if (tabKey === 'stats') loadStats();
}


/* ──────────────────────────────────────────
   SISTEMA DE BACKUP
   ────────────────────────────────────────── */

function initBackupSystem() {
  // Exportar
  document.getElementById('exportBtn')?.addEventListener('click', exportConfig);

  // Importar
  document.getElementById('importFile')?.addEventListener('change', importConfig);

  // Resetar
  document.getElementById('resetBtn')?.addEventListener('click', resetSite);
}

/** Exporta STATE como arquivo JSON */
function exportConfig() {
  const json = JSON.stringify(STATE, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = 'webcraft-config.json';
  a.click();
  URL.revokeObjectURL(url);

  setBackupStatus('✓ Configurações exportadas.');
}

/** Importa configurações de um arquivo JSON */
function importConfig(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      STATE = { ...DEFAULT_STATE, ...imported };
      setBackupStatus('Salvando na nuvem...');
      await saveStateToCloud(STATE);
      loadChangesIntoPanel();
      navigateTo(currentPage, true);
      setBackupStatus('✓ Importado e salvo na nuvem!');
    } catch {
      setBackupStatus('✗ Arquivo inválido. Use um JSON exportado.');
    }
  };
  reader.readAsText(file);
}

/** Reseta o site para o estado padrão */
async function resetSite() {
  const confirmed = window.confirm('Tem certeza? Todas as alterações serão perdidas para todos os visitantes.');
  if (!confirmed) return;   // Early return: cancelado

  STATE = { ...DEFAULT_STATE };
  setBackupStatus('Resetando na nuvem...');
  await saveStateToCloud(STATE);
  loadChangesIntoPanel();
  navigateTo(currentPage, true);
  setBackupStatus('✓ Site resetado para o padrão em todos os dispositivos.');
}

/** Mostra mensagem de status na aba de backup */
function setBackupStatus(msg) {
  const el = document.getElementById('backupStatus');
  if (!el) return;
  el.textContent = msg;
}


/* ──────────────────────────────────────────
   INIT — Ponto de entrada principal
   ────────────────────────────────────────── */

async function init() {
  // 1. Renderiza IMEDIATAMENTE com cache local — zero travamento
  STATE = loadStateLocal();
  navigateTo('inicio', true);  // force=true para garantir render inicial
  applyStaticEditable();

  // 2. Registra eventos da navbar
  document.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // 3. Menu hambúrguer, login e painel ADM
  initHamburger();
  initAdmLogin();
  initAdmPanel();

  // 4. Sincroniza com a nuvem em background SEM travar nada
  syncFromCloud();

  // 5. Registra visita do usuário (não conta ADM logado)
  trackVisit();
}

/** Busca dados da nuvem em background — não bloqueia a UI */
function syncFromCloud() {
  if (!isWorkerConfigured()) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  fetch(`${WORKER_CONFIG.URL}/api/state`, { signal: controller.signal })
    .then(res => {
      clearTimeout(timeout);
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(data => {
      const merged = { ...DEFAULT_STATE, ...data };
      merged['portfolio'] = (data['portfolio'] && data['portfolio'].length > 0)
        ? data['portfolio']
        : DEFAULT_STATE['portfolio'];
      const cloudState = merged;
      if (JSON.stringify(cloudState) !== JSON.stringify(STATE)) {
        STATE = cloudState;
        saveStateLocal(STATE);
        navigateTo(currentPage, true);
        applyStaticEditable();
      }
    })
    .catch(() => {
      clearTimeout(timeout);
      // Falha silenciosa — site já está funcionando com cache local
    });
}


/** Exibe indicador de sincronização discreto no rodapé */
function showCloudStatus(msg) {
  let el = document.getElementById('cloudStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cloudStatus';
    el.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(17,17,17,.92); border: 1px solid #2a2a2a;
      color: #888; font-size: .75rem; font-family: 'DM Sans',sans-serif;
      padding: .4rem 1rem; border-radius: 999px;
      z-index: 500; pointer-events: none;
      display: flex; align-items: center; gap: .4rem;
      backdrop-filter: blur(8px);
    `;
    document.body.appendChild(el);
  }
  el.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:#e8ff47;display:inline-block;animation:cloudPulse 1s ease-in-out infinite;"></span>${msg}`;
  el.style.opacity = '1';

  // Injeta keyframe se não existir
  if (!document.getElementById('cloudPulseStyle')) {
    const s = document.createElement('style');
    s.id = 'cloudPulseStyle';
    s.textContent = '@keyframes cloudPulse{0%,100%{opacity:.3}50%{opacity:1}}';
    document.head.appendChild(s);
  }
}

function hideCloudStatus() {
  const el = document.getElementById('cloudStatus');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el.remove(), 400);
}

/** Aplica valores do STATE em elementos estáticos (fora das páginas dinâmicas) */
function applyStaticEditable() {
  // Logo: usa imagem, não substitui pelo texto do STATE
  // (o texto 'logo-text' do STATE é usado apenas no painel ADM como label)

  const footer = document.querySelector('[data-editable="footer-text"]');
  if (footer) footer.textContent = STATE['footer-text'];

  const waLabel = document.querySelector('[data-editable="whatsapp-label"]');
  if (waLabel) waLabel.textContent = STATE['whatsapp-label'];

  const waBtn = document.getElementById('whatsappBtn');
  if (waBtn) waBtn.href = STATE['whatsapp-link'];
}


/* ──────────────────────────────────────────
   ANALYTICS — rastreamento de visitas
   ────────────────────────────────────────── */

/** Registra visita — ignora o próprio dono do site */
function trackVisit() {
  if (!isWorkerConfigured()) return;
  fetch(`${WORKER_CONFIG.URL}/api/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: document.referrer || '' }),
  }).catch(() => {});
}

/** Carrega e exibe estatísticas no painel ADM */
async function loadStats() {
  const list = document.getElementById('statsVisitList');

  if (!isWorkerConfigured()) {
    if (list) list.innerHTML = '<p style="font-size:.82rem;color:var(--color-text-muted)">Worker não configurado.</p>';
    return;
  }

  if (list) list.innerHTML = '<p style="font-size:.82rem;color:var(--color-text-muted)">Carregando...</p>';

  const controller = new AbortController();
  setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${WORKER_CONFIG.URL}/api/stats`, {
      headers: { 'X-ADM-Token': WORKER_CONFIG.ADM_TOKEN },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(res.status);
    const stats = await res.json();

    document.getElementById('statTotal').textContent     = stats.total   ?? 0;
    document.getElementById('statToday').textContent     = stats.today   ?? 0;
    const countries = [...new Set((stats.visits || []).map(v => v.country).filter(Boolean))];
    document.getElementById('statCountries').textContent = countries.length || 0;

    const visits = (stats.visits || []).slice(0, 100);
    if (!visits.length) {
      list.innerHTML = '<p style="font-size:.82rem;color:var(--color-text-muted)">Nenhuma visita ainda.</p>';
      return;
    }

    const grouped = {};
    visits.forEach(v => {
      if (!grouped[v.date]) grouped[v.date] = [];
      grouped[v.date].push(v);
    });

    list.innerHTML = Object.entries(grouped).map(([date, vs]) => `
      <div class="stats-date-group">
        <div class="stats-date-label">${formatDate(date)} — ${vs.length} visita${vs.length > 1 ? 's' : ''}</div>
        ${vs.map(v => `
          <div class="stats-visit-row">
            <span class="stats-flag">${countryFlag(v.country)}</span>
            <span class="stats-visit-info">
              <strong>${v.country || '??'}</strong>
              ${v.ref ? `<small>via ${shortUrl(v.ref)}</small>` : '<small>Acesso direto</small>'}
            </span>
            <span class="stats-visit-time">${v.time || ''}</span>
          </div>`).join('')}
      </div>`).join('');

  } catch {
    if (list) list.innerHTML = '<p style="font-size:.82rem;color:var(--color-text-muted)">Erro ao carregar. Verifique o Worker.</p>';
  }
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function shortUrl(url) {
  try { return new URL(url).hostname; } catch { return url.slice(0, 30); }
}
function countryFlag(code) {
  if (!code || code === '??') return '🌍';
  try { return code.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))); }
  catch { return '🌍'; }
}
document.addEventListener('DOMContentLoaded', init);
