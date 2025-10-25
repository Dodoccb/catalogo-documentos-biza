// Ambiente: desenvolvimento local (usa mock-data.json)
// No SIGO: troque DATA_URL para '/api/documentos' e (opcional) adicione credentials:'include'

// ================== Config ==================
const DATA_URL = '/api/documentos';
const FAVORITES_KEY = 'biza_docs_favorites';
const EXPIRY_WINDOW_DAYS = 25; // até 25 dias será "A vencer"

// ================== DOM ==================
const $ = (id) => document.getElementById(id);
const grid = $('grid');
const selArea = $('filterArea');
const selTipo = $('filterTipo');
const search = $('search');
const onlyValid = $('onlyValid');
const onlyExpired = $('onlyExpired'); // check "Mostrar apenas vencidos"
const total = $('total');
const btnFavoritos = $('btnFavoritos');
const viewer = $('viewer');
const viewerFrame = $('viewerFrame');
const viewerTitle = $('viewerTitle');
const closeViewer = $('closeViewer');

let ALL = [];
let showOnlyFavs = false;

const getFavs = () => new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
const saveFavs = (set) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(set)));

// ================== Datas ==================
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;      // 2025-11-03
  const br  = /^(\d{2})\/(\d{2})\/(\d{4})$/;    // 03/11/2025

  let y, m, d;
  if (iso.test(s)) {
    const m1 = s.match(iso);
    y = +m1[1]; m = +m1[2] - 1; d = +m1[3];
  } else if (br.test(s)) {
    const m2 = s.match(br);
    d = +m2[1]; m = +m2[2] - 1; y = +m2[3];
  } else {
    const n = new Date(s);
    if (!isNaN(n)) return n;
    return null;
  }
  const dt = new Date(y, m, d, 23, 59, 59); // fim do dia
  return isNaN(dt) ? null : dt;
}

function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((a - b) / MS);
}

// ================== Status ==================
function computeStatusLabel(doc) {
  // 1) Se houver validade, decide por data
  const dt = toDate(doc.validade);
  if (dt) {
    const hoje = new Date();
    if (dt < hoje) return 'Vencido';
    const dias = daysBetween(dt, hoje); // dias até a validade
    if (dias <= EXPIRY_WINDOW_DAYS) return 'A vencer';
    return 'Válido';
  }

  // 2) Sem data → tenta status textual
  const s = (doc.status || '').toLowerCase();
  if (s.includes('vencid') || s.includes('expir') || s.includes('obsole')) return 'Vencido';
  if (s.includes('válid')) return 'Válido';
  if (s.includes('rascun')) return 'Rascunho';
  return doc.status || '—';
}

function statusCssClass(label) {
  const k = (label || '').toLowerCase();
  if (k.includes('vencid')) return 'vencido';
  if (k.includes('a vencer')) return 'avencer';
  if (k.includes('válid')) return 'valido';
  if (k.includes('rascun')) return 'rascunho';
  if (k.includes('obsole')) return 'obsoleto';
  return '';
}

function isExpired(doc) {
  const label = computeStatusLabel(doc);
  return /vencid/i.test(label);
}

// ================== Helpers UI ==================
function humanExt(ext) {
  if (!ext) return '—';
  const map = { pdf:'PDF', doc:'Word', docx:'Word', xls:'Excel', xlsx:'Excel', ppt:'PowerPoint', pptx:'PowerPoint' };
  return map[ext.toLowerCase()] || ext.toUpperCase();
}

function buildFilters(data) {
  const areas = Array.from(new Set(data.map(d => d.area))).sort();
  const tipos = Array.from(new Set(data.map(d => d.tipo))).sort();
  selArea.innerHTML = '<option value="">Todas as áreas</option>' + areas.map(a => `<option>${a}</option>`).join('');
  selTipo.innerHTML = '<option value="">Todos os tipos</option>' + tipos.map(t => `<option>${t}</option>`).join('');
}

function cardHTML(d, isFav) {
  const label = computeStatusLabel(d);
  const stClass = statusCssClass(label);
  const favIcon = isFav ? '★' : '☆';
  const ext = humanExt(d.extensao);
  const openURL = encodeURIComponent(d.urlViewer || d.url || '#');

  return `
    <article class="card" data-open="${openURL}" data-title="${encodeURIComponent(d.nome)}" data-ext="${(d.extensao || '').toLowerCase()}" tabindex="0">
      <h3 title="${d.nome}">${d.nome}</h3>
      <div class="meta">
        <span class="tag area">${d.area || '—'}</span>
        <span class="tag tipo">${d.tipo || '—'}</span>
        <span class="tag">Versão ${d.versao || '—'}</span>
        <span class="tag">${ext}</span>
      </div>
      <div class="row" style="font-size:14px; color:var(--muted)">
        <span><b>Código:</b> ${d.codigo || '—'}</span>
        ${d.validade ? `<span style="margin-left:12px;"><b>Validade:</b> ${d.validade}</span>` : ''}
        <span class="spacer"></span>
        <span class="status ${stClass}">${label}</span>
      </div>
      <div class="row actions">
        <button class="btn-ghost" data-fav="${d.id}" aria-label="Favoritar">${favIcon} Favoritar</button>
      </div>
    </article>`;
}

function render() {
  const favs = getFavs();
  const q = (search.value || '').trim().toLowerCase();
  const fArea = selArea.value || '';
  const fTipo = selTipo.value || '';

  let list = ALL.filter(d => {
    if (showOnlyFavs && !favs.has(d.id)) return false;
    if (onlyValid.checked && computeStatusLabel(d) !== 'Válido') return false;
    if (onlyExpired.checked && !isExpired(d)) return false;
    if (fArea && d.area !== fArea) return false;
    if (fTipo && d.tipo !== fTipo) return false;
    if (q) {
      const hay = `${d.nome} ${d.codigo || ''} ${d.area || ''} ${d.tipo || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  total.textContent = `Total: ${list.length}`;
  grid.innerHTML = list.map(d => cardHTML(d, favs.has(d.id))).join('');

  grid.querySelectorAll('[data-fav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-fav');
      const set = getFavs();
      set.has(id) ? set.delete(id) : set.add(id);
      saveFavs(set);
      render();
    });
  });

  grid.querySelectorAll('[data-open]').forEach(card => {
    card.addEventListener('click', () => {
      const url = decodeURIComponent(card.getAttribute('data-open'));
      const title = decodeURIComponent(card.getAttribute('data-title'));
      const ext = (card.getAttribute('data-ext') || '').toLowerCase();
      openInViewer(url, title, ext);
    });
  });
}

function openInViewer(url, title, ext) {
  let viewURL = url;
  const isSigoViewer = url.includes('/viewer') || url.includes('/visualizar');
  if (!isSigoViewer) {
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
      viewURL = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(url);
    }
  }
  viewerTitle.textContent = title || 'Visualizador';
  viewerFrame.src = viewURL;
  viewer.classList.add('open');
}

closeViewer.addEventListener('click', () => {
  viewer.classList.remove('open');
  viewerFrame.src = '';
});

[search, selArea, selTipo, onlyValid, onlyExpired].forEach(el => el.addEventListener('input', render));
btnFavoritos.addEventListener('click', () => {
  showOnlyFavs = !showOnlyFavs;
  btnFavoritos.textContent = showOnlyFavs ? 'Todos' : 'Favoritos';
  render();
});

// ================== Boot ==================
async function boot() {
  try {
    const res = await fetch(DATA_URL, {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
      // no SIGO: credentials:'include'
    });
    if (!res.ok) throw new Error('Falha ao buscar documentos');
    const raw = await res.json();
    ALL = raw.map(adaptSigoRecord);
    buildFilters(ALL);
    render();
  } catch (e) {
    console.error('Erro carregando documentos:', e);
  }
}

function adaptSigoRecord(raw) {
  return {
    id: raw.id || raw.ID || crypto.randomUUID(),
    nome: raw.nome || raw.Nome || raw.titulo,
    codigo: raw.codigo || raw.Codigo || raw.cod,
    tipo: raw.tipo || raw.Tipo || 'Documento',
    area: raw.area || raw.Area || 'Geral',
    status: raw.status || raw.Status || 'Válido',
    versao: raw.versao || raw.Versao || '-',
    criacao: raw.criacao || raw.Criacao,
    publicacao: raw.publicacao || raw.Publicacao,

    // aceita várias nomenclaturas vindas do SIGO
    validade:
      raw.validade || raw.Validade ||
      raw.vencimento || raw.Vencimento ||
      raw.expiraEm || raw.ExpiraEm ||
      raw.dataVencimento || raw.DataVencimento || null,

    favorito: !!raw.favorito,
    urlViewer: raw.urlViewer || raw.viewer || null,
    url: raw.url || raw.Url || '#',
    urlHistorico: raw.urlHistorico || raw.Historico || null,
    extensao: (raw.extensao || raw.Extensao || '').toLowerCase(),
  };
}

boot();

