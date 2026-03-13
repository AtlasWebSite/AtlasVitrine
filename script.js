/**
 * script.js — WebCraft Studio
 * ════════════════════════════════════════════════════════════
 * Sistema Handler central:
 *   - Roteamento SPA (troca de páginas sem reload)
 *   - Renderização de templates
 *   - Sistema ADM (login, edição, upload, backup)
 *   - Persistência em NUVEM via JSONBin.io
 *     → Alterações do ADM ficam visíveis para TODOS os visitantes
 *
 * Convenções:
 *   - Early Return: sem else aninhado
 *   - Funções pequenas e focadas
 *   - Comentários descritivos por seção
 * ════════════════════════════════════════════════════════════
 */

/* ──────────────────────────────────────────
   CONFIGURAÇÃO JSONBIN.IO
   ────────────────────────────────────────────
   1. Acesse https://jsonbin.io e crie uma conta gratuita
   2. Crie um novo Bin com o conteúdo do DEFAULT_STATE abaixo
   3. Copie o BIN_ID (aparece na URL: /v3/b/SEU_ID)
   4. Vá em Account > API Keys, gere uma chave e cole em API_KEY
   ────────────────────────────────────────── */
const JSONBIN_CONFIG = {
  BIN_ID:  '69b45779aa77b81da9e129e2',
  API_KEY: '$2a$10$kEtZqF0DUiyB1QpHhcxVUO3hSDVx3cI52SWbOF6jkFcwgziZgQJHm',
  BASE_URL: 'https://api.jsonbin.io/v3/b',
};

/** Verifica se o JSONBin está configurado */
function isJsonBinConfigured() {
  return JSONBIN_CONFIG.BIN_ID !== 'COLE_SEU_BIN_ID_AQUI';
}

/* ──────────────────────────────────────────
   ESTADO GLOBAL — dados editáveis do site
   ────────────────────────────────────────── */
const DEFAULT_STATE = {
  'hero-title':    'Seu Negócio Merece um <em>Site Profissional</em>',
  'hero-subtitle': 'Criamos sites modernos que fortalecem sua presença digital, atraem mais clientes e impulsionam o crescimento do seu negócio.',
  'cta-btn':       'Quero meu site',
  'cta-link':      'https://wa.me/5500000000000',
  'logo-text':     'WebCraft',
  'footer-text':   '© 2025 WebCraft Studio. Todos os direitos reservados.',
  'whatsapp-link': 'https://wa.me/5500000000000',
  'whatsapp-label':'Fale Conosco',
  'hero-image':    '',   // base64 ou URL da imagem hero
};

// Estado ativo (mutável durante a sessão)
let STATE = { ...DEFAULT_STATE };

/* ──────────────────────────────────────────
   CLOUD SYNC — JSONBin.io
   Lê e escreve o STATE na nuvem para que
   TODOS os visitantes vejam as mesmas edições.
   ────────────────────────────────────────── */

/**
 * Busca o STATE da nuvem (JSONBin)
 * Fallback: localStorage se JSONBin não estiver configurado
 * @returns {Promise<object>} state
 */
async function loadStateFromCloud() {
  // Fallback local se não configurado
  if (!isJsonBinConfigured()) {
    return loadStateLocal();
  }

  try {
    const res = await fetch(`${JSONBIN_CONFIG.BASE_URL}/${JSONBIN_CONFIG.BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': JSONBIN_CONFIG.API_KEY,
        'X-Bin-Meta':   'false',   // retorna só o record, sem metadata
      },
    });

    if (!res.ok) throw new Error(`JSONBin: HTTP ${res.status}`);

    const data = await res.json();
    // O JSONBin retorna { record: {...}, metadata: {...} }
    // Com X-Bin-Meta: false retorna o objeto diretamente
    const remote = data.record ?? data;
    return { ...DEFAULT_STATE, ...remote };

  } catch (err) {
    console.warn('JSONBin: falha ao carregar, usando local.', err.message);
    return loadStateLocal();
  }
}

/**
 * Salva o STATE na nuvem (JSONBin) e também localmente como cache
 * @returns {Promise<boolean>} sucesso
 */
async function saveStateToCloud(state) {
  // Salva localmente sempre (cache offline)
  saveStateLocal(state);

  if (!isJsonBinConfigured()) return false;

  try {
    const res = await fetch(`${JSONBIN_CONFIG.BASE_URL}/${JSONBIN_CONFIG.BIN_ID}`, {
      method:  'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_CONFIG.API_KEY,
      },
      body: JSON.stringify(state),
    });

    if (!res.ok) throw new Error(`JSONBin: HTTP ${res.status}`);
    return true;

  } catch (err) {
    console.warn('JSONBin: falha ao salvar.', err.message);
    return false;
  }
}

/* ── Cache local (fallback offline) ── */
function loadStateLocal() {
  try {
    const saved = localStorage.getItem('webcraft_state');
    if (!saved) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(saved) };
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
      <!-- Gradiente radial de fundo -->
      <radialGradient id="hBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#e8ff47" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="#0a0a0a" stop-opacity="0"/>
      </radialGradient>

      <!-- Filtro brilho suave -->
      <filter id="hGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>

      <!-- Filtro brilho forte -->
      <filter id="hGlowStrong" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="10" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>

      <!-- Gradiente do anel externo -->
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#e8ff47" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#e8ff47" stop-opacity="0.1"/>
      </linearGradient>

      <!-- Clip das engrenagens -->
      <clipPath id="gearClip">
        <circle cx="200" cy="200" r="130"/>
      </clipPath>
    </defs>

    <!-- ── Fundo ── -->
    <rect width="400" height="400" fill="url(#hBg)" rx="20"/>

    <!-- ── Anéis guia (pontilhados) ── -->
    <circle cx="200" cy="200" r="140" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="6 8"/>
    <circle cx="200" cy="200" r="100" fill="none" stroke="#1e1e1e" stroke-width="1" stroke-dasharray="4 6"/>
    <circle cx="200" cy="200" r="60"  fill="none" stroke="#252525" stroke-width="1" stroke-dasharray="3 5"/>

    <!-- ── Engrenagem externa (roda lentamente) ── -->
    <g class="hs-gear-a" style="transform-origin:200px 200px">
      <!-- Corpo da engrenagem grande -->
      <circle cx="200" cy="200" r="90" fill="#0e0e0e" stroke="#282828" stroke-width="1.5"/>
      <!-- 16 dentes via path aproximado -->
      <g fill="#181818" stroke="#333" stroke-width="1">
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(0   200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(22.5 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(45  200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(67.5 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(90  200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(112.5 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(135 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(157.5 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(180 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(202.5 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(225 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(247.5 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(270 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(292.5 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(315 200 200)"/>
        <rect x="196" y="106" width="8" height="18" rx="3"  transform="rotate(337.5 200 200)"/>
      </g>
      <!-- Furos decorativos -->
      <circle cx="200" cy="155" r="7" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(0   200 200)"/>
      <circle cx="200" cy="155" r="7" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(60  200 200)"/>
      <circle cx="200" cy="155" r="7" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(120 200 200)"/>
      <circle cx="200" cy="155" r="7" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(180 200 200)"/>
      <circle cx="200" cy="155" r="7" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(240 200 200)"/>
      <circle cx="200" cy="155" r="7" fill="#0a0a0a" stroke="#2a2a2a" stroke-width="1" transform="rotate(300 200 200)"/>
    </g>

    <!-- ── Engrenagem média (contra-rotação) ── -->
    <g class="hs-gear-b" style="transform-origin:200px 200px">
      <circle cx="200" cy="200" r="55" fill="#0b0b0b" stroke="#252525" stroke-width="1.5"/>
      <g fill="#141414" stroke="#2e2e2e" stroke-width="1">
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(0   200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(30  200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(60  200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(90  200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(120 200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(150 200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(180 200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(210 200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(240 200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(270 200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(300 200 200)"/>
        <rect x="197" y="141" width="6" height="13" rx="2" transform="rotate(330 200 200)"/>
      </g>
    </g>

    <!-- ── Anel luminoso central ── -->
    <circle cx="200" cy="200" r="32" fill="none" stroke="url(#ringGrad)" stroke-width="1.5" filter="url(#hGlow)"/>

    <!-- ── Núcleo ── -->
    <circle cx="200" cy="200" r="26" fill="#0d0d0d" stroke="#2a2a2a" stroke-width="1"/>
    <!-- Brilho central -->
    <circle cx="200" cy="200" r="14" fill="#e8ff47" opacity="0.92" filter="url(#hGlowStrong)"/>
    <circle cx="200" cy="200" r="8"  fill="#0a0a0a"/>
    <circle cx="200" cy="200" r="3"  fill="#e8ff47" opacity="0.7"/>

    <!-- ── Nós satélites (6 posições) ── -->
    <!-- Cada nó: linha tracejada + card + ponto lima -->

    <!-- Direita -->
    <line x1="245" y1="200" x2="284" y2="200" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 5" opacity="0.35"/>
    <rect x="282" y="188" width="40" height="24" rx="6" fill="#131313" stroke="#e8ff47" stroke-width="0.8" opacity="0.75"/>
    <circle cx="290" cy="200" r="4" fill="#e8ff47" opacity="0.85" filter="url(#hGlow)"/>
    <line x1="296" y1="200" x2="312" y2="200" stroke="#333" stroke-width="0.8"/>
    <rect x="313" y="197" width="6" height="6" rx="1" fill="#333"/>

    <!-- Esquerda -->
    <line x1="155" y1="200" x2="116" y2="200" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 5" opacity="0.35"/>
    <rect x="76"  y="188" width="40" height="24" rx="6" fill="#131313" stroke="#e8ff47" stroke-width="0.8" opacity="0.75"/>
    <circle cx="110" cy="200" r="4" fill="#e8ff47" opacity="0.85" filter="url(#hGlow)"/>
    <line x1="86" y1="200" x2="102" y2="200" stroke="#333" stroke-width="0.8"/>
    <rect x="80" y="197" width="6" height="6" rx="1" fill="#333"/>

    <!-- Superior-direito -->
    <line x1="236" y1="164" x2="264" y2="140" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 5" opacity="0.35"/>
    <rect x="260" y="122" width="40" height="24" rx="6" fill="#131313" stroke="#e8ff47" stroke-width="0.8" opacity="0.75"/>
    <circle cx="268" cy="134" r="4" fill="#e8ff47" opacity="0.85" filter="url(#hGlow)"/>

    <!-- Superior-esquerdo -->
    <line x1="164" y1="164" x2="136" y2="140" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 5" opacity="0.35"/>
    <rect x="98"  y="122" width="40" height="24" rx="6" fill="#131313" stroke="#e8ff47" stroke-width="0.8" opacity="0.75"/>
    <circle cx="130" cy="134" r="4" fill="#e8ff47" opacity="0.85" filter="url(#hGlow)"/>

    <!-- Inferior-direito -->
    <line x1="236" y1="236" x2="264" y2="260" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 5" opacity="0.35"/>
    <rect x="260" y="254" width="40" height="24" rx="6" fill="#131313" stroke="#e8ff47" stroke-width="0.8" opacity="0.75"/>
    <circle cx="268" cy="266" r="4" fill="#e8ff47" opacity="0.85" filter="url(#hGlow)"/>

    <!-- Inferior-esquerdo -->
    <line x1="164" y1="236" x2="136" y2="260" stroke="#e8ff47" stroke-width="1" stroke-dasharray="4 5" opacity="0.35"/>
    <rect x="98"  y="254" width="40" height="24" rx="6" fill="#131313" stroke="#e8ff47" stroke-width="0.8" opacity="0.75"/>
    <circle cx="130" cy="266" r="4" fill="#e8ff47" opacity="0.85" filter="url(#hGlow)"/>

    <!-- ── Label inferior ── -->
    <text x="200" y="374"
          text-anchor="middle"
          font-family="'Syne',sans-serif"
          font-size="9.5"
          font-weight="700"
          letter-spacing="5"
          fill="#383838">HANDLER SYSTEM</text>

    <!-- ── Animações ── -->
    <style>
      .hs-gear-a { animation: hsRotA 20s linear infinite;         transform-origin: 200px 200px; }
      .hs-gear-b { animation: hsRotB 13s linear infinite reverse; transform-origin: 200px 200px; }
      @keyframes hsRotA { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
      @keyframes hsRotB { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
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
          <span class="hero__badge">
            <svg width="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
            Agência Digital
          </span>
          <h1 class="hero__title" data-editable="hero-title">${s['hero-title']}</h1>
          <p class="hero__subtitle" data-editable="hero-subtitle">${s['hero-subtitle']}</p>
          <div class="hero__actions">
            <a href="${s['cta-link']}" class="btn btn--primary" id="ctaBtn" data-link="cta-link" target="_blank" rel="noopener">
              <span data-editable="cta-btn">${s['cta-btn']}</span>
              <svg width="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="#" class="btn btn--outline" data-page="funciona">Como funciona</a>
          </div>
        </div>

        <!-- Coluna visual: Imagem Handler animada -->
        <div class="hero__visual">
          ${s['hero-image']
            ? `<img src="${s['hero-image']}" alt="Site profissional" class="hero__img" />`
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
function navigateTo(pageKey) {
  const template = pages[pageKey];
  if (!template) return;   // Early return: página não existe

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
  navigateTo(currentPage);
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
   PAINEL ADM — Login
   ────────────────────────────────────────── */

const ADM_PASSWORD = 'admadm';

function initAdmLogin() {
  const triggerBtn  = document.getElementById('admTrigger');
  const loginModal  = document.getElementById('admLoginModal');
  const closeBtn    = document.getElementById('closeLoginModal');
  const loginBtn    = document.getElementById('admLoginBtn');
  const errorEl     = document.getElementById('admError');
  const passInput   = document.getElementById('admPassword');

  if (!triggerBtn || !loginModal) return;

  // Abre modal ao clicar no ícone do footer
  triggerBtn.addEventListener('click', () => {
    openLoginModal();
  });

  // Fecha modal
  closeBtn?.addEventListener('click', closeLoginModal);
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
  });

  // Login ao clicar no botão
  loginBtn?.addEventListener('click', attemptLogin);

  // Login ao pressionar Enter
  passInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });

  function openLoginModal() {
    loginModal.classList.add('open');
    passInput?.focus();
  }

  function closeLoginModal() {
    loginModal.classList.remove('open');
    if (passInput) passInput.value = '';
    errorEl?.classList.remove('visible');
  }

  function attemptLogin() {
    if (!passInput) return;
    const pwd = passInput.value.trim();

    if (pwd !== ADM_PASSWORD) {
      errorEl?.classList.add('visible');
      passInput.focus();
      passInput.select();
      return;   // Early return: senha errada
    }

    closeLoginModal();
    openAdmPanel();
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
}

/** Atualiza o indicador de status da nuvem no painel */
function updateCloudStatusIndicator() {
  const box   = document.getElementById('cloudConfigStatus');
  const label = document.getElementById('cloudStatusLabel');
  const desc  = document.getElementById('cloudStatusDesc');
  const guide = document.getElementById('jsonbinGuide');

  if (!box || !label || !desc) return;

  if (isJsonBinConfigured()) {
    box.className = 'adm-cloud-status ok';
    label.textContent = '☁ Nuvem conectada';
    desc.textContent  = 'Alterações salvas para todos os visitantes.';
    guide?.removeAttribute('open');
  } else {
    box.className = 'adm-cloud-status warn';
    label.textContent = '⚠ JSONBin não configurado';
    desc.textContent  = 'Alterações ficam apenas neste navegador.';
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
      navigateTo(currentPage);
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
  navigateTo(currentPage);
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
  // 1. Mostra site com dados locais (cache) imediatamente — sem flash branco
  STATE = loadStateLocal();
  navigateTo('inicio');
  applyStaticEditable();

  // 2. Busca dados atualizados da nuvem em background
  showCloudStatus('Sincronizando...');
  const cloudState = await loadStateFromCloud();
  STATE = cloudState;
  saveStateLocal(STATE); // atualiza cache local

  // 3. Re-renderiza com dados da nuvem
  navigateTo(currentPage);
  applyStaticEditable();
  hideCloudStatus();

  // 4. Registra cliques na navbar principal
  document.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // 5. Menu hambúrguer mobile
  initHamburger();

  // 6. Login ADM
  initAdmLogin();

  // 7. Painel ADM
  initAdmPanel();
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
  const logo = document.querySelector('[data-editable="logo-text"]');
  if (logo) logo.innerHTML = `<span class="logo-dot"></span>${STATE['logo-text']}`;

  const footer = document.querySelector('[data-editable="footer-text"]');
  if (footer) footer.textContent = STATE['footer-text'];

  const waLabel = document.querySelector('[data-editable="whatsapp-label"]');
  if (waLabel) waLabel.textContent = STATE['whatsapp-label'];

  const waBtn = document.getElementById('whatsappBtn');
  if (waBtn) waBtn.href = STATE['whatsapp-link'];
}

// Aguarda DOM estar pronto
document.addEventListener('DOMContentLoaded', init);
