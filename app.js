// Ambiente: rodando DENTRO do SIGO
// Autenticação: já feita pelo SIGO (cookie/sessão). Nada de token no front-end.
// Requisições: mesma origem (same-origin), enviando credenciais (cookies) automaticamente.

// Configuração
const DATA_URL = 'mock-data.json'; // endpoint do SIGO (mesma origem)
const FAVORITES_KEY = 'biza_docs_favorites';

// Helpers DOM
const $ = (id) => document.getElementById(id);
const grid = $('grid');
const selArea = $('filterArea');
const selTipo = $('filterTipo');
const search = $('search');
const onlyValid = $('onlyValid');
const onlyAtual = $('onlyAtual');
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

function statusClass(s) {
  const k = (s || '').toLowerCase();
  if (k.includes('válid')) return 'valido';
  if (k.includes('rascun')) return 'rascunho';
  if (k.includes('obso')) return 'obsoleto';
  return '';
}

function humanExt(ext) {
  if (!ext) return '—';
  const map = {
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',
    xls: 'Excel',
    xlsx: 'Excel',
    ppt: 'PowerPoint',
    pptx: 'PowerPoint',
  };
  return map[ext.toLowerCase()] || ext.toUpperCase();
}

function buildFilters(data) {
  const areas = Array.from(new Set(data.map((d) => d.area))).sort();
  const tipos = Array.from(new Set(data.map((d) => d.tipo))).sort();
  selArea.innerHTML = '<option value="">Todas as áreas</option>' + areas.map((a) => `<option>${a}</option>`).join('');
  selTipo.innerHTML = '<option value="">Todos os tipos</option>' + tipos.map((t) => `<option>${t}</option>`).join('');
}

function cardHTML(d, isFav) {
  const stClass = statusClass(d.status);
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
        <span class="spacer"></span>
        <span class="status ${stClass}">${d.status || '—'}</span>
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

  let list = ALL.filter((d) => {
    if (showOnlyFavs && !favs.has(d.id)) return false;
    if (onlyValid.checked && d.status !== 'Válido') return false;
    if (fArea && d.area !== fArea) return false;
    if (fTipo && d.tipo !== fTipo) return false;
    if (q) {
      const hay = `${d.nome} ${d.codigo || ''} ${d.area || ''} ${d.tipo || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (onlyAtual.checked) {
    const newest = new Map();
    for (const d of list) {
      const key = d.codigo || d.nome;
      const v = parseInt(d.versao || '0', 10);
      if (!newest.has(key) || v > newest.get(key).v) newest.set(key, { v, d });
    }
    list = Array.from(newest.values()).map((x) => x.d);
  }

  total.textContent = `Total: ${list.length}`;
  grid.innerHTML = list.map((d) => cardHTML(d, favs.has(d.id))).join('');

  grid.querySelectorAll('[data-fav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-fav');
      const set = getFavs();
      set.has(id) ? set.delete(id) : set.add(id);
      saveFavs(set);
      render();
    });
  });

  grid.querySelectorAll('[data-open]').forEach((card) => {
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

[search, selArea, selTipo, onlyValid, onlyAtual].forEach((el) => el.addEventListener('input', render));
btnFavoritos.addEventListener('click', () => {
  showOnlyFavs = !showOnlyFavs;
  btnFavoritos.textContent = showOnlyFavs ? 'Todos' : 'Favoritos';
  render();
});

async function boot() {
  try {
    const res = await fetch(DATA_URL, {
      method: 'GET',
      credentials: 'include', // usa cookies do SIGO
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!res.ok) throw new Error('Falha ao buscar documentos');
    const raw = await res.json();
    ALL = raw.map(adaptSigoRecord);
    buildFilters(ALL);
    render();
  } catch (e) {
    console.error('Erro carregando documentos do SIGO:', e);
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
    favorito: !!raw.favorito,
    urlViewer: raw.urlViewer || raw.viewer || null,
    url: raw.url || raw.Url || '#',
    urlHistorico: raw.urlHistorico || raw.Historico || null,
    extensao: (raw.extensao || raw.Extensao || '').toLowerCase(),
  };
}

boot();
